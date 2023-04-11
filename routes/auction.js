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

// get auctions (both active/finished) with their info from chain, by event id
router.get('/auctions-by-event-id/:eventId', async (req, res) => {
  const { eventId } = req.params;

  if (!eventId) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    let auctions = await Auction.find({ eventId: eventId });

    // Fetch details from blockchain for each auction

    for (const auction of auctions) {
      let auctionInfo = await auctionContract.methods
        .GetAuctionInfo(auction.auctionId)
        .call();

      auctionInfo = {
        ticketId: parseInt(auctionInfo[0]),
        eventId: parseInt(auctionInfo[1]),
        auctionId: parseInt(auctionInfo[2]),
        seller: auctionInfo[3],
        endAt: auctionInfo[4],
        started: auctionInfo[5],
        ended: auctionInfo[6],
        highestBidder: auctionInfo[7],
        highestBid: parseFloat(web3.utils.fromWei(auctionInfo[8], 'ether')),
        startingPrice: parseFloat(web3.utils.fromWei(auctionInfo[9], 'ether')),
      };

      auction._doc.ticketId = auctionInfo.ticketId;
      auction._doc.eventId = auctionInfo.eventId;
      auction._doc.auctionId = auctionInfo.auctionId;
      auction._doc.seller = auctionInfo.seller;
      auction._doc.endAt = auctionInfo.endAt;
      auction._doc.started = auctionInfo.started;
      auction._doc.ended = auctionInfo.ended;
      auction._doc.highestBidder = auctionInfo.highestBidder;
      auction._doc.highestBid = auctionInfo.highestBid;
      auction._doc.startingPrice = auctionInfo.startingPrice;
    }

    auctions = auctions.filter((auction) => {
      return auction._doc.started == true;
    });

    res.json(auctions);
    return;
  } catch (err) {
    console.error(err);
    res.status(500);
    res.json({ message: 'Failed to get auctions' });
    return;
  }
});

// create auction
router.post('/create-bid-item', auth, async (req, res) => {
  const { ticketId, eventId, startPrice, time } = req.body;

  if (!ticketId || !eventId || !startPrice || !time) {
    console.log('Inputs are not valid');
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    // Create auction in mongodb
    const auction = await Auction.create({
      eventId: eventId,
    });

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
    // Update mongodb: set finished to true

    const transaction = await auctionContract.methods
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

router.get('/get-auction', async (req, res) => {
  const { auctionId } = req.query;

  if (!auctionId) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    let auction = await auctionContract.methods
      .GetAuctionInfo(auctionId)
      .call();

    auction = {
      ticketId: auction[0],
      eventId: auction[1],
      auctionId: auction[2],
      seller: auction[3],
      endAt: auction[4],
      started: auction[5],
      ended: auction[6],
      highestBidder: auction[7],
      highestBid: web3.utils.fromWei(auction[8], 'ether'),
      startingPrice: web3.utils.fromWei(auction[9], 'ether'),
    };

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
    let prevBids = await auctionContract.methods.listPrevBids(auctionId).call();

    prevBids = prevBids.map((bid) => {
      return {
        bidder: bid[0],
        bid: parseFloat(web3.utils.fromWei(bid[1], 'ether')),
        isBack: bid[2],
      };
    });

    // [
    //   {bidder: "0x123123123", bid: 0, isBack: false},
    //   {bidder: "0x123123123", bid: 0, isBack: false},
    //   {bidder: "0x123123123", bid: 0, isBack: false},
    //   {bidder: "0x123123123", bid: 0, isBack: false},
    //   {bidder: "0x123123123", bid: 0, isBack: false},
    // ]

    res.json({ prevBids });
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
    const transaction = await auctionContract.methods
      .placeBid(auctionId)
      .encodeABI();

    let transactionParameters = {
      from: req.user.publicAddress,
      to: ContractDetails.AuctionContractAddress,
      value: parseInt(web3.utils.toWei(bidPrice.toString(), 'ether')).toString(
        16
      ),
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
