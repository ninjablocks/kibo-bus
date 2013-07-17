var chai = require('chai');

var log = require('debug')('test:bus');
var amqp = require('amqp');

var topicStream = require('../lib/topic_stream.js');

var expect = chai.expect;

describe('TopicStream', function () {

  it('should create a new topic stream', function (done) {

    var connection =
      amqp.createConnection({url: "amqp://guest:guest@localhost:5672"});

    connection.on('ready', function () {
      log('Connection', 'open')
      topicStream({connection: connection, exchangeName: '/test/events', routingKey: '#'}, function (err, stream) {
        expect(err).to.not.exist;
        expect(stream).to.exist;
        stream.end();
        done();
      })
    })
  });

  it('should send data', function (done) {

    var connection =
      amqp.createConnection({url: "amqp://guest:guest@localhost:5672"});

    connection.on('ready', function () {
      log('Connection', 'open');
      topicStream({connection: connection, exchangeName: '/test/events', routingKey: '#'}, function (err, stream) {
        stream.write({message: 'something'});
        stream.end();
        done()
      })
    })

  });

});