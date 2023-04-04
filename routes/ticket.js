const express = require('express');
const Hash = require('ipfs-only-hash');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const auth = require('../middlewares/auth');
const multer = require('multer');
const uploadmw = multer();
const { Readable } = require('stream');
require('dotenv').config();

const ContractDetails = require('../contracts/ContractDetails');
const contractABI = require('../contracts/TicketMint.json');
const marketABI = require('../contracts/TicketMarket.json');
const alchemyAPIKey = process.env['ALCHEMY_API_KEY'];
const { createAlchemyWeb3 } = require('@alch/alchemy-web3');

const recoverPersonalSignature = require('eth-sig-util');

const Ticket = require('../models/ticket');

// Using HTTPS
const web3 = createAlchemyWeb3(
  'https://polygon-mumbai.g.alchemy.com/v2/' + alchemyAPIKey
);
let MintContract = new web3.eth.Contract(
  contractABI.abi,
  ContractDetails.ContractAddress
);
let MarketContract = new web3.eth.Contract(
  marketABI.abi,
  ContractDetails.MarketContractAddress
);
const router = express.Router();

const getNFTMetadata = async (contract, token) => {
  try {
    const res = await web3.alchemy.getNftMetadata({
      contractAddress: contract,
      tokenId: token,
    });
    return res.metadata;
  } catch (e) {
    console.log(e);
    return {};
  }
};

router.get('/', async (req, res) => {
  const token = req.query['token'];

  if (!token) {
    res.status(400);
    res.json({ message: 'Contract address or token is not valid!' });
    return;
  }

  const result = await getNFTMetadata(ContractDetails.ContractAddress, token);

  if (Object.keys(result).length === 0) {
    res.status(404);
    res.json({ message: 'Could not found such ticket' });
    return;
  }
  res.status(200);
  res.json({ result: result });
});

router.post('/mint', auth, uploadmw.any(), async (req, res) => {
  const { name, image, eventId, startDateTime, endDateTime } = req.body;
  let { amount } = req.body;
  if (!amount) amount = 1;

  // 1-Upload image to IPFS and get its hash
  const img_buffer = Buffer.from(image, 'base64');

  let imageUploadRes = await uploadFromBuffer(img_buffer);

  if (!imageUploadRes) {
    console.error({ message: 'Unable to pin image to IPFS' });
    res.json({ message: 'Unable to pin image to IPFS' });
    return;
  }

  let img_hash = imageUploadRes.IpfsHash;
  console.log('img_hash:', img_hash);

  // 2-Upload JSON to IPFS and get its hash
  let send_json = {
    name: name,
    image: 'ipfs://' + img_hash,
    amount: amount,
    eventId: eventId,
    startDateTime: startDateTime,
    endDateTime: endDateTime,
  };

  const json_buffer = Buffer.from(JSON.stringify(send_json), 'utf-8');

  let jsonUploadRes = await uploadFromBuffer(json_buffer);

  if (!jsonUploadRes) {
    console.error({ message: 'Unable to pin JSON to IPFS' });
    res.json({ message: 'Unable to pin JSON to IPFS' });
    return;
  }

  let json_hash = jsonUploadRes.IpfsHash;
  console.log('json_hash:', json_hash);

  // Interact with Smart Contract to mint
  let transactionParameters = {};

  try {
    let data = MintContract.methods
      .mintNFT(`ipfs://${json_hash}`, eventId, amount)
      .encodeABI();

    transactionParameters = {
      to: ContractDetails.ContractAddress, // Required except during contract publications.
      from: req.user.publicAddress, // must match user's active address.
      data: data,
    };

    console.log('transactionParameters:', transactionParameters);
    console.log('SUCCESSFUL MINT!');
    res.json(transactionParameters);
    return;
  } catch (e) {
    console.error('Error during MintContract.methods.mintNFT', e);
    res.json({ fail: true, e: e });
    return;
  }
});

router.post('/is-ticket-checked', auth, async (req, res) => {
  const { tokenId, nonce, signature } = req.body;
  let ticket = await MarketContract.methods.NFTItem(tokenId).call();
  const isUsed = ticket['used'];
  if (isUsed) {
    res.status(401);
    res.json({ value: true, message: 'This ticket is used before!' });
    return;
  }
  const eventId = ticket[2];
  const ticketOwner = ticket[3];
  const checkerPublicAddress = req.user.publicAddress;
  let isChecker = await MintContract.methods
    .verifyTicketController(checkerPublicAddress, eventId)
    .call();
  if (!isChecker) {
    res.status(401);
    res.json({ value: true, message: 'You are not the event controller!' });
    return;
  }
  const address = recoverPersonalSignature.recoverPersonalSignature({
    data: nonce,
    sig: signature,
  });

  // Is QR code creator Owner
  if (ticketOwner.toLocaleLowerCase() !== address.toLocaleLowerCase()) {
    // I
    res.status(401);
    res.json({
      value: true,
      message: 'The QR code creator is not the ticket owner!',
    });
    return;
  }
  const foundTicketInDB = await Ticket.findOne({ tokenId: tokenId });
  // Did we check before
  if (!foundTicketInDB) {
    // we did not check before
    // so add ticket to mongo, meaning that mark it checked
    await Ticket.create({
      tokenId: tokenId,
      controllerAddress: checkerPublicAddress.toLocaleLowerCase(),
    });

    res.json({ value: false });
    return;
  } else {
    res.json({ value: true, message: 'This ticket is checked before!' });
    return;
  }
});

router.post('/change-ticket-used-state', auth, async (req, res) => {
  const { eventID } = req.body;
  // marketItem.use(tokenIds);

  const callerAddress = req.user.publicAddress.toLocaleLowerCase();

  try {
    // 0- Fetch checked ticket Ids (checked by the caller)
    const checkedTokenIds = await Ticket.find({
      controllerAddress: callerAddress,
    });

    // 1- Remove these temporarily stored tickets from mongo
    Ticket.deleteMany({
      controllerAddress: req.user.publicAddress.toLocaleLowerCase(),
    });
    console.log('burda mi hata');
    let tokenIds = checkedTokenIds.map((e) => e.tokenId);
    console.log(tokenIds);
    console.log(eventID);
    // 2- Change chain state by calling contract function
    // It will ensure only controllerAddress is able to call this function
    // (msg.sender == controller)
    let data = await MarketContract.methods
      .useTickets(tokenIds, eventID, ContractDetails.ContractAddress)
      .encodeABI();
    console.log('weer');
    transactionParameters = {
      to: ContractDetails.MarketContractAddress, // Required except during contract publications.
      from: req.user.publicAddress, // must match user's active address.
      data: data,
    };

    console.log('SUCCESSFUL USE-TICKETS!');
    res.json(transactionParameters);
  } catch (e) {
    console.log('FAILED USE-TICKET');
  }
});
const uploadFromBuffer = async (buffer) => {
  try {
    const stream = Readable.from(buffer);
    const data = new FormData();
    data.append('file', stream, {
      filepath: 'image.png',
    });

    const res = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      data,
      {
        maxBodyLength: 'Infinity',
        headers: {
          pinata_api_key: process.env['PINATA_API_KEY'],
          pinata_secret_api_key: process.env['PINATA_SECRET_API_KEY'],
        },
      }
    );
    // console.log('res.data:', res.data);
    return res.data;
  } catch (error) {
    console.log(error);
  }
};

module.exports = router;
