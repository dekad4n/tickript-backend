const express = require('express');
const axios = require('axios');

const auth = require('../middlewares/auth');
require('dotenv').config();

const ContractDetails = require('../contracts/ContractDetails');
const contractABI = require('../contracts/TicketMint.json');
const marketABI = require('../contracts/TicketMarket.json');
const auctionABI = require('../contracts/TicketAuction.json');

const alchemyAPIKey = process.env['ALCHEMY_API_KEY'];
const { createAlchemyWeb3 } = require('@alch/alchemy-web3');
const web3 = createAlchemyWeb3(
  'https://polygon-mumbai.g.alchemy.com/v2/' + alchemyAPIKey
);
const Auction = require('../models/auction');

marketContract = new web3.eth.Contract(
  marketABI.abi,
  ContractDetails.MarketContractAddress
);

auctionContract = new web3.eth.Contract(
  auctionABI.abi,
  ContractDetails.AuctionContractAddress
);

const router = express.Router();

// create auction
router.post('/create-bid-item', auth, async (req, res) => {
  const { ticketId, eventId, startPrice, time } = req.body;

  if (!ticketId || !eventId || !startPrice || !time) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }
  const auction = await Auction.create({
    ticketId: ticketId,
  });
  try {
    transaction = await auctionContract.methods
      .createBidItem(
        ticketId,
        eventId,
        auction.auctionId,
        web3.utils.toWei(startPrice.toString(), 'ether').toString(),
        time
      )
      .encodeABI();
    let transactionParameters = {
      from: req.user.publicAddress,
      to: ContractDetails.AuctionContractAddress,
    };
    transactionParameters['data'] = transaction;

    console.log(transactionParameters);
    res.json(transactionParameters);
    return;
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({ message: 'Failed to start auction' });
    return;
  }
});

router.post('/stop-auction', auth, async (req, res) => {
  const { auctionId } = req.body;

  if (!auctionId) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    transaction = await auctionContract.methods
      .StopAuction(auctionId)
      .encodeABI();
    let transactionParameters = {
      from: req.user.publicAddress,
      to: ContractDetails.AuctionContractAddress,
    };
    transactionParameters['data'] = transaction;

    console.log(transactionParameters);
    res.json(transactionParameters);
    return;
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({ message: 'Failed to stop auction' });
    return;
  }
});

router.get('/get-auction', auth, async (req, res) => {
  const { auctionId } = req.query;

  if (!auctionId) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    const auction = await auctionContract.methods
      .GetAuctionInfo(auctionId)
      .call();
    res.json(auction);
    return;
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({ message: 'Failed to get auction' });
    return;
  }
});

router.get('/list-prev-bids', auth, async (req, res) => {
  const { auctionId } = req.query;

  if (!auctionId) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    const prevBids = await auctionContract.methods
      .listPrevBids(auctionId)
      .call();
    res.json(prevBids);
    return;
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({ message: 'Failed to get auction' });
    return;
  }
});

router.post('/bid', auth, async (req, res) => {
  const { auctionId, bidPrice } = req.body;

  if (!auctionId) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    transaction = await auctionContract.methods.placeBid(auctionId).encodeABI();
    let transactionParameters = {
      from: req.user.publicAddress,
      to: ContractDetails.AuctionContractAddress,
      value:
        bidPrice ?? web3.utils.toWei(bidPrice.toString(), 'ether').toString(),
    };
    transactionParameters['data'] = transaction;

    console.log(transactionParameters);
    res.json(transactionParameters);
    return;
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({ message: 'Failed to bid' });
    return;
  }
});

router.post('/finish-bid', auth, async (req, res) => {
  const { auctionId } = req.body;

  if (!auctionId) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    transaction = await auctionContract.methods
      .finishBid(auctionId)
      .encodeABI();
    let transactionParameters = {
      from: req.user.publicAddress,
      to: ContractDetails.AuctionContractAddress,
    };
    transactionParameters['data'] = transaction;

    console.log(transactionParameters);
    res.json(transactionParameters);
    return;
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({ message: 'Failed to end auction' });
    return;
  }
});

router.post('/payback-prev-bids', auth, async (req, res) => {
  const { auctionId } = req.body;

  if (!auctionId) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    transaction = await auctionContract.methods
      .payBackPrevBids(auctionId)
      .encodeABI();
    let transactionParameters = {
      from: req.user.publicAddress,
      to: ContractDetails.AuctionContractAddress,
    };
    transactionParameters['data'] = transaction;

    console.log(transactionParameters);
    res.json(transactionParameters);
    return;
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({ message: 'Failed to payback previous bids' });
    return;
  }
});

module.exports = router;
