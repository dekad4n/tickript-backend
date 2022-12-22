const express = require('express');
const { json } = require('express/lib/response');
const User = require('../models/user');
const uuid = require('uuid');
const router = express.Router();
var auth = require('../middlewares/auth');
const formidable = require('formidable');
const check = require('../middlewares/check');

//TODO: logout

router.get('/', async (req, res) => {
  if (Object.keys(req.query).length == 0) {
    res.json({ resp: 'user endpoint' });
    return;
  }
  const walletID = req.query.publicAdress;
  if (walletID != null && check.validateWalletID(walletID)) {
    let user = await User.findOne({
      id: req.query.publicAdress.toLocaleLowerCase(),
    });

    if (user == null) {
      let nonce = uuid.v4();

      user = await User.create({
        id: req.query.publicAdress.toLocaleLowerCase(),
        username: req.query.publicAdress.toLocaleLowerCase(),
        nonce,
      });

      res.status(200);
      res.json({ user: user });
    } else {
      res.status(200);
      res.json({ user: user });
    }
  } else {
    res.status(400);
    res.send('-');
  }
});

module.exports = router;
