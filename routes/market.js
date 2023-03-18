const express = require('express');
const auth = require('../middlewares/auth');
const router = express.Router();

const marketABI = require('../contracts/TicketMarket.json');
const ContractDetails = require('../contracts/ContractDetails');

const alchemyAPIKey = process.env['ALCHEMY_API_KEY'];
const { createAlchemyWeb3 } = require('@alch/alchemy-web3');
const axios = require('axios');

const web3 = createAlchemyWeb3(
  'https://polygon-mumbai.g.alchemy.com/v2/' + alchemyAPIKey
);

marketContract = new web3.eth.Contract(
  marketABI.abi,
  ContractDetails.MarketContractAddress
);
const isHex = (num) => {
  return Boolean(num.match(/^0x[0-9a-f]+$/i));
};

// To get ticket as MarketItem by tokenId
router.get('/market-item', async (req, res) => {
  const tokenId = req.query.tokenId;

  const data = await marketContract.methods.NFTItem(tokenId).call();

  console.log(data);
  res.json('ok');
  return;
});

// To get all MarketItems (sold & onsale) belong to a given eventId
router.get('/market-items-all', async (req, res) => {
  const eventId = req.query.eventId;

  const marketItemsAllRaw = await marketContract.methods
    .ListEventTicketAll(eventId)
    .call();

  const marketItemsAll = [];

  marketItemsAllRaw.forEach((marketItem) => {
    marketItemsAll.push({
      nftContract: marketItem[0],
      tokenID: parseInt(marketItem[1]),
      eventID: parseInt(marketItem[2]),
      ticketOwner: marketItem[3],
      eventOwner: marketItem[4],
      seller: marketItem[5],
      price: parseFloat(web3.utils.fromWei(marketItem[6], 'ether')),
      ticketType: marketItem[7],
      sold: marketItem[8],
      soldBefore: marketItem[9],
    });
  });

  return res.json({ marketItemsAll });
});

// To get onsale MarketItems belong to a given eventId || publicAddress

router.post('/resell', auth, async (req, res) => {
  let { price, tokenId } = req.body;

  let transactionParameters = {
    to: ContractDetails.MarketContractAddress, // Required except during contract publications.
    from: req.user.publicAddress, // must match user's active address.
    value: web3.utils.toWei(price, 'ether'),
  };

  transaction = await marketContract.methods
    .ResellTicket(
      web3.utils.toWei(price, 'ether'),
      ContractDetails.ContractAddress,
      tokenId
    )
    .encodeABI();

  transactionParameters['data'] = transaction;

  console.log(transactionParameters);
  res.json(transactionParameters);
  return;
});

// To list minted NFT's on market
router.post('/sell', auth, async (req, res) => {
  let { eventId, price, amount } = req.body;

  eventId = parseInt(eventId);
  amount = parseInt(amount);

  let transactionParameters = {
    to: ContractDetails.MarketContractAddress, // Required except during contract publications.
    from: req.user.publicAddress, // must match user's active address.
    value: web3.utils.toWei(price, 'ether'),
  };

  transaction = await marketContract.methods
    .createMarketItem(
      web3.utils.toWei(price, 'ether'),
      ContractDetails.ContractAddress,
      'normal',
      eventId,
      amount
    )
    .encodeABI();

  transactionParameters['data'] = transaction;

  console.log(transactionParameters);
  res.json(transactionParameters);
  return;
});

router.post('/stop-sale', auth, async (req, res) => {
  let { price, tokenId } = req.body;

  let transactionParameters = {
    to: ContractDetails.MarketContractAddress, // Required except during contract publications.
    from: req.user.publicAddress, // must match user's active address.
    value: web3.utils.toWei(price.toString(), 'ether'),
  };

  try {
    const transaction = await marketContract.methods
      .StopTicketSale(
        web3.utils.toWei(price, 'ether'),
        ContractDetails.ContractAddress,
        tokenId
      )
      .encodeABI();

    transactionParameters['data'] = transaction;
  } catch (e) {
    console.error('ERROR AT STOP-SALE:', e);
  }

  console.log(transactionParameters);
  res.json(transactionParameters);
});

router.post('/stop-batch-sale', auth, async (req, res) => {
  let { price, tokenIds, eventId } = req.body;

  let transactionParameters = {
    to: ContractDetails.MarketContractAddress, // Required except during contract publications.
    from: req.user.publicAddress, // must match user's active address.
    value: web3.utils.toWei(price.toString(), 'ether'),
  };

  try {
    const transaction = await marketContract.methods
      .StopBatchSale(
        web3.utils.toWei(price, 'ether'),
        ContractDetails.ContractAddress,
        tokenIds,
        eventId
      )
      .encodeABI();

    transactionParameters['data'] = transaction;
  } catch (e) {
    console.error('ERROR AT STOP-BATCH-SALE:', e);
  }

  res.json(transactionParameters);
});

router.post('/buy', auth, async (req, res) => {
  let { tokenIds, price } = req.body;

  let transactionParameters = {
    to: ContractDetails.MarketContractAddress, // Required except during contract publications.
    from: req.user.publicAddress, // must match user's active address.
    value: parseInt(web3.utils.toWei(price.toString(), 'ether')).toString(16),
  };

  try {
    const transaction = await marketContract.methods
      .ticketSale(ContractDetails.ContractAddress, tokenIds)
      .encodeABI();

    transactionParameters['data'] = transaction;
  } catch (e) {
    console.error('ERROR AT BUY:', e);
  }

  res.json(transactionParameters);
});
module.exports = router;
