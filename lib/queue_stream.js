var log = require('debug')('ninja::queue_stream');
var through = require('through');

module.exports = function (options, cb) {

  var connection = options.connection;
  var exchangeName = options.exchangeName || '';
  if(!options.queueName) {
    cb(Error('Missing queueName.'));
    return;
  }
  var queueName = options.queueName;

  log('exchangeName', exchangeName);

  connection.exchange(exchangeName, {type: 'topic'}, function (exchange) {
    log('Exchange', exchange.name, 'open');

    var stream = through();

    var q = connection.queue(queueName, function (queue) {

      log('Queue', queue.name, 'open');

      stream.bindRoutingKey = function(key, cb){
        log('bindRoutingKey', queue.name, key);
        queue.bind(exchange, key);
        cb && cb(null);
      }

      log('Queue', queue.name, 'subscribe');
      queue.subscribe(function (message) {
        stream.emit('data', message);
      });

      cb(null, stream);

    });

    stream.on('end', function(){
      log('Queue', q.name, 'close');
      q.close();
    });

  })

};