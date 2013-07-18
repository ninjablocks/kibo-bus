# kibo-bus

This component is specifically designed to separate the bus from the
dojo/cloud services.

# Objectives

So the goal of this library is to seperate people using the bus from the actual protocol / system / service used to provide it.

Messaging can be quite complicated, especially in the case of AMQP so I would like to reduce the surface area of the API
just to the bits we need while ensuring these smaller bits are FAST and reliable.

# Usage

To connect and open a stream which subscribes or publishes to a topic.

```javascript

var bus = require('kibo-bus');

// connect to the block/events exchange and create a queue for reading named /queue/events
bus.subscribe('blocks/events', '/queue/events', function (err, stream) {

  // subscribe to events with a routing key of 12345678
  stream.bindRoutingKey('12345678', function(err){
    // send then off into something else
    stream.pipe( anotherStream );
  })

});

```
