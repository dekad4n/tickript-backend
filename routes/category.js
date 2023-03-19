const express = require('express');
const { json } = require('express/lib/response');

const uuid = require('uuid');
var auth = require('../middlewares/auth');

const router = express.Router();
const Category = require('../models/category');

router.get('/get-all', async (req, res) => {
  let result = await Category.find();
  res.json(result);
});

router.post('/add', async (req, res) => {
  let result = await Category.create({
    image: req.body.image,
    name: req.body.name,
  });
  res.json(result);
});

module.exports = router;
