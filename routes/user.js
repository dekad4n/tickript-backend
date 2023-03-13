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

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const cloudinaryURL = process.env['CLOUDINARY_URL'];
cloudinary.config({
  cloud_name: process.env['CLOUDINARY_NAME'],
  api_key: process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_SECRET'],
  secure: true,
});

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

let uploadFromBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    let cld_upload_stream = cloudinary.uploader.upload_stream(
      {
        folder: 'foo',
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(cld_upload_stream);
  });
};

router.post('/update', auth, async (req, res) => {
  const { username, name, avatar } = req.body;
  if (username === undefined && name === undefined) {
    res.status(400);
    res.json({ user: req.user });
    return;
    set;
  }
  var avatarURL = '';
  if (avatar) {
    var avatarImageBytes = Buffer.from(avatar, 'base64');

    let result = await uploadFromBuffer(avatarImageBytes);

    avatarURL = result.url;
    console.log(avatarURL);
  }

  let updatedUser = Object.assign({});
  updatedUser = addIfDefined('username', username, updatedUser);
  updatedUser = addIfDefined('name', name, updatedUser);
  updatedUser = addIfDefined('avatar', avatarURL, updatedUser);

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
  const events = {};
  await Promise.all(
    result.data.ownedNfts.map(async (item, index) => {
      let eventId = item.metadata.eventId;

      if (!eventId) {
        eventId = 24;
      }
      const event = await Event.findOne({ integerId: eventId });

      if (events[eventId] !== undefined) {
        events[eventId].items.push(item);
      } else {
        events[eventId] = { event: event, items: [] };
      }
    })
  );
  res.json(events);
});
module.exports = router;
