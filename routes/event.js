const express = require('express');
var auth = require('../middlewares/auth');

const Event = require('../models/event');

const router = express.Router();

router.get('/', async (req, res) => {
  const id = req.query['id'];
  if (!id) {
    res.status(400);
    res.json({ message: 'Event id is invalid' });
  }

  const result = await Event.findById(id);

  res.status(200);
  res.json(result);
});

router.post('/create', auth, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400);
    res.json({ message: 'Required parameters are not valid!' });
    return;
  }
  // TO DO: IMPLEMENT FILE UPLOAD

  const result = await Event.create({
    name: name,
    owner: req.user.publicAddress,
  });

  res.status(200);
  res.json(result);
});

module.exports = router;
