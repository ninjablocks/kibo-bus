"use strict";

var chai = require('chai');
var log = require('debug')('test:bus');
var through = require('through');
var Bus = require('../index.js');

var expect = chai.expect;

describe('Bus', function () {

  it('should open a publish stream', function (done) {

    log('open');
    var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});

    bus.publish({exchangeName: 'sometestpub'}, function (err, stream) {
      log('stream', 'publish');
      expect(stream).to.exist;
      stream.write({message: 'TEST', routingKey: 'TEST'});
      done();
    });

  });

  it('should open a subscribe stream', function (done) {

    log('open');
    var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});

    log('subscribe');
    bus.subscribe({exchangeName: '/bustestsub', queueName: '/queue/sometestpub2'}, function (err, stream) {

      log('stream', 'subscribe');
      expect(err).to.not.exist;
      expect(stream).to.exist;

      stream.pipe(through(function onData(data) {
        expect(data).to.exist;
        log('message', 'relieved', data);
        done();
      }));

      stream.bindRoutingKey('TEST', function (err) {

        expect(err).to.not.exist;

        bus.publish({exchangeName: '/bustestsub'}, function (err, stream) {
          log('stream', 'publish');
          stream.write({message: "TEST subscribe", _routingKey: "TEST"});
        });
      });
    });

  });

  it('should open a queue and get two messages', function (done) {

    log('open');
    var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});

    bus.get({routingKey: 'TEST', exchangeName: '/bustestget', queueName: '/queue/sometestget'}, function (err, data) {
      log('get', data);
      expect(err).to.not.exist;
      expect(data).to.exist;

      bus.get({routingKey: 'TEST', exchangeName: '/bustestget', queueName: '/queue/sometestget'}, function (err, data) {
        log('get', data);
        expect(err).to.not.exist;
        expect(data).to.exist;

        done();

      });
    });

    bus.publish({exchangeName: '/bustestget'}, function (err, stream) {
      log('stream', 'publish');

      stream.write({message: "TEST", _routingKey: "TEST"});
      stream.write({message: "TEST", _routingKey: "TEST"});

    });

  });

  it('should open a queue and get should timeout', function (done) {

    log('open');
    var bus = new Bus({rabbit_url: 'amqp://guest:guest@localhost:5672'});

    bus.get({routingKey: 'TEST', exchangeName: '/bustestget', queueName: '/queue/sometestget'}, function (err, data) {
      log('get', data);
      expect(err).to.exist;
      expect(data).to.not.exist;
      done();
    });

  });
});
