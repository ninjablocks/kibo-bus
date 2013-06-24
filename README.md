# kibo-bus

This componenet is specifically designed to seperate the bus from the
dojo/cloud services.

# Usage

To connect and open a stream which subscribes or publishes to a topic.

```javascript

var bus = require('kibo-bus');

// connect
bus.subscribe('blocks/12345678/events', function (err, stream) {
  stream.pipe( SOMETHING STREAMY );
});

```
