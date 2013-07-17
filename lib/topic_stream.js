var log = require('debug')('ninja:bus:topic_stream');
var through = require('through');

module.exports = function (options, cb) {

  var connection = options.connection;
  var exchangeName = options.exchangeName || '';
  var params = options.params || {contentEncoding: 'utf8', contentType: 'application/json'};

  log('exchangeName', exchangeName);

  connection.exchange(exchangeName, {type: 'topic'}, function (exchange) {
    log('Exchange', exchange.name, 'open');
    var stream = through(
      function write(data) {
        if(data.routingKey) {
          exchange.publish(data.routingKey, JSON.stringify(data), params)
        }
        else {
          exchange.publish('', JSON.stringify(data), params)
        }
      },
      function end() { //optional
        exchange.close();
      }
    )

    cb(null, stream);
  })


};