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

  const event = await Event.findById(id);
  res.status(200);
  res.json({ event });
});

router.post('/create', auth, async (req, res) => {
  const {
    coverImageEncoded,
    title,
    startDate,
    endDate,
    startTime,
    endTime,
    category,
    description,
  } = req.body;

  if (
    !coverImageEncoded ||
    !title ||
    !startDate ||
    !endDate ||
    !startTime ||
    !endTime ||
    !category ||
    !description
  ) {
    console.log('asdasd');
    res.status(400);
    res.json({ message: 'Required parameters are not valid!' });
    return;
  }
  // TO DO: IMPLEMENT FILE UPLOAD
  const event = await Event.create({
    owner: req.user.publicAddress,
    coverImageEncoded,
    title,
    startDate,
    endDate,
    startTime,
    endTime,
    category,
    description,
  });

  res.status(200);
  res.json({ event });
});

module.exports = router;
