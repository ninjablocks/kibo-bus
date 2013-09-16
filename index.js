"use strict";

var log = require('debug')('ninja:bus');
var amqp = require('amqp');
var events = require('events');
var util = require('util');

var topicStream = require('topic-stream');
var queueStream = require('queue-stream');

var queueParams = {"durable": true, "autoDelete":false};
var topicParams = {contentEncoding: 'utf8', contentType: 'application/json', type: 'direct'};

var Bus = function (options) {
  events.EventEmitter.call(this);

  log('connect', options.rabbit_url);
  this._connection =
    amqp.createConnection({url: "amqp://guest:guest@localhost:5672"});

  var self = this;
  this._connection.once('ready', function () {
    log('Bus', 'ready');
    self.emit('ready');
  });

  this.subscribe = function (path, queueName, cb) {
    log('subscribe', path);
    queueStream({connection: this._connection, exchangeName: path, queueName: queueName, params: queueParams}, cb);
  };

  this.publish = function (path, cb) {
    log('publish', path);
    topicStream({connection: this._connection, exchangeName: path, params: topicParams}, cb);
  };
};

util.inherits(Bus, events.EventEmitter);

module.exports = Bus;
