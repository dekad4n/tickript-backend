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
  const { ticketId, eventId, auctionId, startPrice, time } = req.body;

  if (!ticketId || !eventId || !auctionId || !startPrice || !time) {
    res.status(400);
    res.json({ message: 'Inputs are not valid' });
    return;
  }

  try {
    transaction = await auctionContract.methods
      .createBidItem(
        ticketId,
        eventId,
        auctionId,
        web3.utils.toWei(startPrice, 'ether'),
        time
      )
      .encodeABI();

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

module.exports = router;
