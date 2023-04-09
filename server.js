//jshint esversion:6
const express = require('express');
const bodyParser = require('body-parser');

const mongoose = require('mongoose');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// TO DO: Implement cors policy
// const cors = require('cors')

const app = express();
const port = process.env.PORT;

// Routes
const testRoute = require('./routes/test');
const authRoute = require('./routes/auth');
const userRoute = require('./routes/user');
const ticketRoute = require('./routes/ticket');
const eventRoute = require('./routes/event');
const utilsRoute = require('./routes/utils');
const marketRoute = require('./routes/market');
const categoryRoute = require('./routes/category');
var session = require('express-session');
// app.use(cors)

app.use(function (req, res, next) {
  console.log('Request:', req.method, req.originalUrl);
  next();
});

app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 50000 },
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '20mb',
  })
);
app.use(
  bodyParser.json({
    limit: '20mb',
  })
);
app.use('/public', express.static('public'));

app.use('/api', testRoute);
app.use('/auth', authRoute);
app.use('/user', userRoute);
app.use('/ticket', ticketRoute);
app.use('/event', eventRoute);
app.use('/utils', utilsRoute);
app.use('/market', marketRoute);
app.use('/category', categoryRoute);

const connectDB = (mongoose) => {
  mongoose
    .connect(process.env['MONGO_URI'])
    .then(() => console.log('db connected'))
    .catch((err) => {
      setTimeout(() => {
        connectDB();
      }, 5000);
    });
};
// Connect to DB Function
connectDB(mongoose);
// Bad Request Error
app.use((error, req, res, next) => {
  console.log(error);
  res.status(400);
  res.send({
    'status code': '400',
    message: 'bad request',
    request: error.body,
  });
});

// Print the routes
function print(path, layer) {
  if (layer.route) {
    layer.route.stack.forEach(
      print.bind(null, path.concat(split(layer.route.path)))
    );
  } else if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach(
      print.bind(null, path.concat(split(layer.regexp)))
    );
  } else if (layer.method) {
    console.log(
      '%s /%s',
      layer.method.toUpperCase(),
      path.concat(split(layer.regexp)).filter(Boolean).join('/')
    );
  }
}

function split(thing) {
  if (typeof thing === 'string') {
    return thing.split('/');
  } else if (thing.fast_slash) {
    return '';
  } else {
    var match = thing
      .toString()
      .replace('\\/?', '')
      .replace('(?=\\/|$)', '$')
      .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);
    return match
      ? match[1].replace(/\\(.)/g, '$1').split('/')
      : '<complex:' + thing.toString() + '>';
  }
}

app._router.stack.forEach(print.bind(null, []));

app.listen(port, () => {
  console.log('Tickript backend listening on port ' + port);
});
