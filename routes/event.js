const express = require('express');
var auth = require('../middlewares/auth');

const Event = require('../models/event');

const router = express.Router();

const formidable = require('formidable');
const res = require('express/lib/response');
const { eventNames } = require('process');
const { errors } = require('web3-core-helpers');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const ContractDetails = require('../contracts/ContractDetails');
const contractABI = require('../contracts/TicketMint.json');
const alchemyAPIKey = process.env['ALCHEMY_API_KEY'];
const { createAlchemyWeb3 } = require('@alch/alchemy-web3');

// Using HTTPS
const web3 = createAlchemyWeb3(
  'https://polygon-mumbai.g.alchemy.com/v2/' + alchemyAPIKey
);
let MintContract = new web3.eth.Contract(
  contractABI.abi,
  ContractDetails.ContractAddress
);

const cloudinaryURL = process.env['CLOUDINARY_URL'];
cloudinary.config({
  cloud_name: process.env['CLOUDINARY_NAME'],
  api_key: process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_SECRET'],
  secure: true,
});

router.get('/', async (req, res) => {
  const id = req.query['id'];
  if (!id) {
    res.status(400);
    res.json({ message: 'Event id is invalid' });
  }

  // Get event details from MongoDB
  const event = await Event.findById(id);

  res.status(200);
  res.json({ event });
});

router.get('/get-random-event', async (req, res) => {
  const result = await Event.aggregate([{ $sample: { size: 1 } }]);
  res.json(result[0]);
});

router.get('/minted-event-ticket-tokens', async (req, res) => {
  const integerId = req.query['integerId'];

  // Get ticket details from Mint Contract
  let mintedEventTicketTokens = await MintContract.methods
    .getEventTicketList(integerId)
    .call();

  res.json({ mintedEventTicketTokens });
  return;
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
    res.status(400);
    res.json({ message: 'Required parameters are not valid!' });
    return;
  }

  var coverImageBytes = Buffer.from(coverImageEncoded, 'base64');

  let result = await uploadFromBuffer(coverImageBytes);

  coverImageURL = result.url;

  const event = await Event.create({
    owner: req.user.publicAddress,
    coverImageURL,
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

router.put('/update', auth, async (req, res) => {
  const form = formidable({ multiples: true });
  if (!req.query['id']) {
    res.status(400);
    res.json({ message: 'Invalid id' });
    return;
  }
  form.parse(req, async (err, fields, files) => {
    const event = await Event.findById(req.query['id']);
    if (event.owner !== req.user.publicAddress) {
      res.status(401);
      res.json({
        message: 'You do not own this event!',
      });
      return;
    }
    let logoURL = event.logo;
    if (files.logo) {
      logoURL = await cloudinary.uploader.upload(files.logo.filepath);
      logoURL = logoURL.url;
      handleDelete(event.logo);
    }
    let bannerURL = event.banner;
    if (files.banner) {
      bannerURL = await cloudinary.uploader.upload(files.banner.filepath);
      bannerURL = bannerURL.URL;
      handleDelete(event.banner);
    }
    const updatedEvent = {
      logo: logoURL,
      banner: bannerURL,
      name: fields.name ? fields.name : event.name,
      description: fields.description ? fields.description : event.description,
    };

    const result = await Event.updateOne(
      { _id: event._id },
      { $set: updatedEvent }
    );
    res.status(200);
    res.json({ ...updatedEvent, _id: event._id });
  });
});

router.post('/set-ticket-controller', auth, (req, res) => {
  const { publicAddress, eventID } = req.body;
  let data = MintContract.methods
    .setTicketController(publicAddress, eventID)
    .encodeABI();
  let transactionParameters = {
    data: data,
    from: req.user.publicAddress,
    to: ContractDetails.ContractAddress,
  };
  res.json(transactionParameters);
});

router.post('/is-ticket-controller', async (req, res) => {
  const { publicAddress, eventID } = req.body;
  try {
    let state = await MintContract.methods
      .verifyTicketController(publicAddress, eventID)
      .call();
    res.json(state);
  } catch {
    res.json(false);
  }
});

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

const handleDelete = async (url) => {
  const splitted = url.split('/');
  const public_id = splitted[splitted.length - 1].split('.')[0];
  try {
    const res = await cloudinary.uploader.destroy(public_id);
  } catch (e) {
    console.log(e);
  }
};
module.exports = router;
