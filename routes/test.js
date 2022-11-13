//jshint esversion:6
const express = require('express');

const router = express.Router();

router.get('/test', (req, res) => {
  res.send('Test is successful!');
});

router.get('/badRequest', (req, res) => {
  res.sendStatus(400);
});

module.exports = router;
