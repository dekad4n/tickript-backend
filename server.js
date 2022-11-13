//jshint esversion:6
const express = require('express');
const bodyParser = require('body-parser');
// TO DO: Implement cors policy 
// const cors = require('cors')

const app = express();
const port = 3001;

// Routes
const testRoute = require("./routes/test");

app.use('/api',testRoute);
// app.use(cors)
app.use(bodyParser.urlencoded(
  {
    extended: true,
    limit: '20mb',
  }
));
app.use(bodyParser.json(
  {
    limit: '20mb',
  }
));
app.use('/public', express.static('public'));


// Bad Request Error
app.use((error, req, res, next) => {
  console.log(error)
  res.status(400)
  res.send({
    "status code": "400",
    "message": "bad request",
    "request": error.body
  })
});

// Print the routes
function print(path, layer) {
  if (layer.route) {
    layer.route.stack.forEach(print.bind(null, path.concat(split(layer.route.path))))
  } else if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach(print.bind(null, path.concat(split(layer.regexp))))
  } else if (layer.method) {
      console.log('%s /%s',
        layer.method.toUpperCase(),
        path.concat(split(layer.regexp)).filter(Boolean).join('/'))
  }
}

function split(thing) {
  if (typeof thing === 'string') {
    return thing.split('/')
  } else if (thing.fast_slash) {
    return ''
  } else {
    var match = thing.toString()
        .replace('\\/?', '')
        .replace('(?=\\/|$)', '$')
        .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//)
    return match
        ? match[1].replace(/\\(.)/g, '$1').split('/')
        : '<complex:' + thing.toString() + '>'
  }
}

app._router.stack.forEach(print.bind(null, []));

app.listen(port, () => {
  console.log("Tickript backend listening on port " + port)
});









