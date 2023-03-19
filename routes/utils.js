const express = require('express');

const Event = require('../models/event');

const router = express.Router();

router.get('/search', async (req, res) => {
  let { searchTitle, id, page, pageLimit } = req.query;
  if (!page) page = 1;
  if (!pageLimit) pageLimit = 10;

  if (!searchTitle && !id) {
    const events = await Event.find({})
      .skip((parseInt(page) - 1) * pageLimit)
      .limit(pageLimit);
    // console.log('events:', events);

    res.json({ events });
    return;
  }
  try {
    if (id) {
      const events = await Event.find({ _id: id });
      res.json({ events });
      return;
    } else {
      try {
        const events = await Event.find({
          title: { $regex: `(?i)${searchTitle}` },
        })
          .skip((parseInt(page) - 1) * pageLimit)
          .limit(pageLimit);
        res.json({ events });
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

router.get('/get-events-by-category', async (req, res) => {
  const category = req.query['category'];
  const result = await Event.find({ category: category });
  console.log(result);
  res.json(result);
});
module.exports = router;
