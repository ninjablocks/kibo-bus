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

  this._readMessage = function (ch, timeoutProtect, cb, msg) {

    // Proceed only if the timeout handler has not yet fired.
    if (timeoutProtect) {

      // Clear the scheduled timeout handler
      clearTimeout(timeoutProtect);

      var obj = JSON.parse(msg.content);
      log('obj', obj);
      ch.ack(msg);
      ch.close();
      cb(null, obj);
    }
  };

  this.subscribe = function (options, cb) {
    log('subscribe', options);
    queueStream(this._connection, {exchangeName: options.exchangeName, queueName: options.queueName, params: queueParams}, cb);
  };

  this.publish = function (options, cb) {
    log('publish', options);
    topicStream(this._connection, {exchangeName: options.exchangeName}, cb);
  };

  this.get = function (options, cb) {
    log('get', options);

    var timeout = 1000 || options.timeout;

    var timeoutProtect = setTimeout(function () {

      // Clear the local timer variable, indicating the timeout has been triggered.
      timeoutProtect = null;

      // Execute the callback with an error argument.
      cb({error: 'async timed out'});

    }, timeout);

    this._connection.then(function (conn) {
      var ok = conn.createChannel();
      ok = ok.then(function (ch) {
        when.all([
          ch.assertQueue(options.queueName, queueParams),
          ch.assertExchange(options.exchangeName, 'topic'),
          ch.consume(options.queueName, self._readMessage.bind(null, ch, timeoutProtect, cb))
        ]);
      });
      return ok;
    });

  };
};

util.inherits(Bus, events.EventEmitter);

module.exports = Bus;
