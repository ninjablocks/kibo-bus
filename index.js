"use strict";

var log = require('debug')('ninja:bus');
var when = require('when');
var amqplib = require('amqplib');
var events = require('events');
var util = require('util');

var topicStream = require('topic-stream');
var queueStream = require('queue-stream');

var queueParams = {durable: true, autoDelete: false, messageTtl: 30000};

var Bus = function (options) {
  events.EventEmitter.call(this);

  log('connect');
  this._connection =
    amqplib.connect(options.rabbit_url);

  var self = this;

  this._asyncParseMessageContent = function (msg, cb) {
    log('msg', msg);
    try {
      var obj = JSON.parse(msg.content);
      cb(null, obj);
    } catch (e) {
      return cb(e);
    }
  };

  this._readMessage = function (ch, timeoutProtect, cb, msg) {

    // TODO need to look into tying this function into the promises

    // Proceed only if the timeout handler has not yet fired.
    if (timeoutProtect) {

      // Clear the scheduled timeout handler
      clearTimeout(timeoutProtect);

      // ack and close the channel
      ch.ack(msg);
      ch.close();
      self._asyncParseMessageContent(msg, cb);
    }

  };

  this.subscribe = function (options, cb) {
    log('subscribe', options);
    queueStream(this._connection, {exchangeName: options.exchange, queueName: options.queue, params: queueParams}, cb);
  };

  this.publish = function (options, cb) {
    log('publish', options);
    topicStream(this._connection, {exchangeName: options.exchange}, cb);
  };

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
          ch.assertQueue(options.queue, queueParams),
          ch.assertExchange(options.exchange, 'topic'),
          ch.bindQueue(options.queue, options.exchange, options.routingKey),
          ch.consume(options.queue, self._readMessage.bind(null, ch, timeoutProtect, cb))
        ]);
      });
      return ok;
    });

  };

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

  this.close = function () {
    this._connection.then(function (conn) {
      log('close');
      conn.close();
    }, console.warn);
  };

};

util.inherits(Bus, events.EventEmitter);

module.exports = Bus;
