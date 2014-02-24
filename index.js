"use strict";

var log = require('debug')('ninja:bus');
var when = require('when');
var amqplib = require('amqplib');
var events = require('events');
var util = require('util');
var crypto = require('crypto');
var xtend = require('xtend');
var hoek = require('hoek');

var topicStream = require('topic-stream');
var queueStream = require('queue-stream');

var queueDefaults = {params: {durable: true, autoDelete: false, messageTtl: 30000, expires: 3600000}};

/**
 * Creates an instance of the bus.
 *
 * @param options
 * @constructor
 */
var Bus = function (options) {
  events.EventEmitter.call(this);

  this.rabbitmq_url = options.rabbitmq_url;
  this.logger = options.logger || console.trace;
  this.metrics = options.metrics == undefined ? true : options.metrics;

  log('connect');
  this._connection =
    amqplib.connect(options.rabbitmq_url);

  var self = this;

  this._consumerTagGenerator = function () {
    return crypto.randomBytes(5).readUInt32BE(0).toString(16);
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
    var bench = new hoek.Bench();

    log('timeout', timeout);

    amqplib.connect(this.rabbitmq_url).then(function (conn) {
      var ok = conn.createChannel();
      ok.then(function (ch) {

        if (self.metrics) console.log('sample#bus.get.conn.open=' + bench.elapsed());
        var consumerTag = self._consumerTagGenerator();

        var timeoutProtect = setTimeout(function () {

          // check variable
          timeoutProtect = null;

          log('cancel', consumerTag);
          ch.cancel(consumerTag);
          ch.close().ensure(function () {
            log('conn', 'close');
            conn.close();
          });

          cb({error: 'async timed out'});

        }, timeout);

        when.all([
          ch.prefetch(1), // ensure only one message is fetched.
          ch.assertQueue(options.queue, xtend(queueDefaults.params, options.params)),
          ch.assertExchange(options.exchange, 'topic'),
          ch.bindQueue(options.queue, options.exchange, options.routingKey),
          ch.consume(options.queue, readMessage, {consumerTag: consumerTag})
        ]).then(null, self.logger);

        function readMessage(msg) {

          // Proceed only if the timeout handler has not yet fired.
          if (timeoutProtect) {

            // Clear the scheduled timeout handler
            clearTimeout(timeoutProtect);

            // ack and close the channel
            ch.ack(msg);
            log('cancel', consumerTag);
            ch.cancel(consumerTag);
            ch.close().ensure(function () {
              log('conn', 'close');
              conn.close();
            });

            try {
              return cb(null, JSON.parse(msg.content));
            } catch (e) {
              return cb(e);
            }
          }

        }
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
    var bench = new hoek.Bench();

    amqplib.connect(this.rabbitmq_url).then(function (conn) {
      var ok = conn.createChannel();
      ok = ok.then(function (ch) {

        if (self.metrics) console.log('sample#bus.put.conn.open=' + bench.elapsed());

        when.all([
            ch.assertExchange(options.exchange, 'topic'),
            ch.publish(options.exchange, options.routingKey, new Buffer(JSON.stringify(content)))
          ]).then(undefined, self.logger).ensure(function () {

          log('channel', 'close');
          ch.close().ensure(function () {
            log('conn', 'close');
            conn.close();
          });

        });
        if (cb) {
          cb();
        }
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

exports = module.exports = Bus;

var bus;

/**
 * Creates a bus which is cached in the module.
 *
 * @param options
 */
exports.createBus = function (options) {
  if (bus === undefined) {
    bus = new Bus(options);
  }
  return bus;
};

