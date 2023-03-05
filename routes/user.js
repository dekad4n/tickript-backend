const express = require('express');
const { json } = require('express/lib/response');

const uuid = require('uuid');
var auth = require('../middlewares/auth');
const formidable = require('formidable');
const check = require('../middlewares/check');

const router = express.Router();

const User = require('../models/user');
const Event = require('../models/event');

const axios = require('axios');
const ContractDetails = require('../contracts/ContractDetails');
const alchemyAPIKey = process.env['ALCHEMY_API_KEY'];

router.get('/', async (req, res) => {
  if (Object.keys(req.query).length == 0) {
    res.json({ resp: 'user endpoint' });
    return;
  }
  const walletID = req.query.publicAddress;
  if (walletID != null && check.validateWalletID(walletID)) {
    let user = await User.findOne({
      publicAddress: req.query.publicAddress.toLocaleLowerCase(),
    });

    if (user == null) {
      let nonce = uuid.v4();

      user = await User.create({
        publicAddress: req.query.publicAddress.toLocaleLowerCase(),
        username: req.query.publicAddress.toLocaleLowerCase(),
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
const addIfDefined = (key, val, hashmap) => {
  if (val !== undefined && val.length > 0) {
    hashmap[key] = val;
  }
  return hashmap;
};

router.post('/update', auth, async (req, res) => {
  const { username, name } = req.body;
  if (username === undefined && name === undefined) {
    res.status(400);
    res.json({ user: req.user });
    return;
    set;
  }

  let updatedUser = Object.assign({});
  updatedUser = addIfDefined('username', username, updatedUser);
  updatedUser = addIfDefined('name', name, updatedUser);
  const user = await User.findOneAndUpdate(
    {
      publicAddress: req.user.publicAddress,
    },
    { $set: updatedUser }
  );
  const toSend = Object.assign({}, user.user, updatedUser);

  res.status(200);
  res.json({ user: toSend });
});

router.get('/events', async (req, res) => {
  if (!req.query.publicAddress) {
    res.status(400);
    res.json({ message: 'You should provide public address' });
    return;
  }
  const publicAddress = req.query.publicAddress;
  try {
    const result = await Event.find({ owner: publicAddress });
    res.status(200);
    res.json(result);
  } catch (e) {}
});

router.get('/tickets', async (req, res) => {
  const publicAddress = req.query.publicAddress;
  const result = await axios.get(
    'https://polygon-mumbai.g.alchemy.com/nft/v2/' + alchemyAPIKey + '/getNFTs',
    {
      params: {
        owner: publicAddress,
        withMetadata: true,
        contractAddresses: [ContractDetails.ContractAddress],
      },
    }
  );
  res.json(result.data.ownedNfts);
});
module.exports = router;
