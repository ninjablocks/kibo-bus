"use strict";

var log = require('debug')('ninja:bus');
var when = require('when');
var amqplib = require('amqplib');
var events = require('events');
var util = require('util');
var crypto = require('crypto');
var xtend = require('xtend');

var topicStream = require('topic-stream');
var queueStream = require('queue-stream');

var queueDefaults = {params: {durable: true, autoDelete: false, messageTtl: 30000, expires: 3600000}};

var Bus = function (options) {
  events.EventEmitter.call(this);

  log('connect');
  this._connection =
    amqplib.connect(options.rabbitmq_url);

  var self = this;

  this._asyncParseMessageContent = function (msg, cb) {
    try {
      var obj = JSON.parse(msg.content);
      cb(null, obj);
    } catch (e) {
      return cb(e);
    }
  };

  this._doGet = function (ch, timeoutProtect, options, cb) {
    log('doGet', 'poll');
    if (timeoutProtect) {
      ch.get(options.queue, {noAck: false}).then(function (msg) {
        if (msg) {
          log('_doGet', 'msg', msg);
          // Clear the scheduled timeout handler
          clearTimeout(timeoutProtect);
          self._asyncParseMessageContent(msg, cb);
          ch.ack(msg);
          ch.close().then(function(){
            log('channel', 'close');
          }, console.warn);
        } else {
          setTimeout(self._doGet, 100);
        }
      });
    }
  };


  /**
   * Subscribe to a queue and return a stream to read from.
   *
   * @param options
   * @param cb
   */
  this.subscribe = function (options, cb) {
    log('subscribe', options);
    queueStream(this._connection, xtend(queueDefaults, options), cb);
  };

  /**
   * Publish to a queue and return a stream to write to.
   *
   * @param options
   * @param cb
   */
  this.publish = function (options, cb) {
    log('publish', options);
    topicStream(this._connection, {exchangeName: options.exchange}, cb);
  };

  /**
   * Get a message from a queue or timeout.
   *
   * @param options
   * @param cb
   */
  this.get = function (options, cb) {
    log('get', options);

    var timeout = options.timeout || 1000;

    log('timeout', timeout);

    var timeoutProtect = setTimeout(function () {

      // Clear the local timer variable,
      // indicating the timeout has been triggered.
      timeoutProtect = null;

      // Execute the callback with an error argument.
      cb({error: 'async timed out'});

    }, timeout);

    this._connection.then(function (conn) {
      var ok = conn.createChannel();
      ok = ok.then(function (ch) {

        when.all([
            ch.assertQueue(options.queue, xtend(queueDefaults.params, options.params)),
            ch.assertExchange(options.exchange, 'topic'),
            ch.prefetch(1),
            ch.bindQueue(options.queue, options.exchange, options.routingKey),

          ]).then(function () {

            setTimeout(self._doGet.bind(null, ch, timeoutProtect, options, cb), 100);

          });
      });
      return ok;
    });

  };

  /**
   * Put a single message into an exchange.
   *
   * @param options
   * @param content
   * @param cb
   */
  this.put = function (options, content, cb) {
    log('put', options);

    this._connection.then(function (conn) {
      var ok = conn.createChannel();
      ok = ok.then(function (ch) {
        when.all([
            ch.assertExchange(options.exchange, 'topic'),
            ch.publish(options.exchange, options.routingKey, new Buffer(JSON.stringify(content)))
          ]).ensure(function () {
            log('channel', 'close');
            ch.close();
          });
        if (cb) cb();
      });
      return ok;
    });

  };

  /**
   * Close the resources used by the bus.
   */
  this.close = function () {
    this._connection.then(function (conn) {
      log('close');
      conn.close();
    }, console.warn);
  };

};

util.inherits(Bus, events.EventEmitter);

module.exports = Bus;
