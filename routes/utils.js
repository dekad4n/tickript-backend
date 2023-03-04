const express = require('express');

const Event = require('../models/event');

const router = express.Router();

router.get('/search', async (req, res) => {
  let { search, id, page, pageLimit } = req.query;
  if (!page) page = 1;
  if (!pageLimit) pageLimit = 10;
  if (!search && !id) {
    res.status(400);
    res.json({ message: 'Provide search query or an id!' });
    return;
  }
  try {
    if (id) {
      const event = await Event.find({ _id: id });
      res.json(event);
      return;
    } else {
      try {
        const events = await Event.find({
          name: { $regex: `(?i)${search}` },
        })
          .skip((parseInt(page) - 1) * pageLimit)
          .limit(pageLimit);
        res.json(events);
      } catch (e) {
        res.status(500);
        res.json({ message: 'There is something wrong' });
      }
    }
  } catch (e) {
    res.status(403);
    res.json({ message: e });
  }
});

module.exports = router;
