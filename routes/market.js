const express = require('express');
const auth = require('../middlewares/auth');
const router = express.Router();

const marketABI = require('../contracts/TicketMarket.json');
const ContractDetails = require('../contracts/ContractDetails');

const alchemyAPIKey = process.env['ALCHEMY_API_KEY'];
const { createAlchemyWeb3 } = require('@alch/alchemy-web3');

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

  const marketItemsAll = await marketContract.methods
    .ListMarketItemsAll(eventId)
    .call();

  return res.json({ marketItemsAll });
});

// To get onsale MarketItems belong to a given eventId
router.get('market-items-onsale', async (req, res) => {
  const eventId = req.query.eventId;

  const marketItemsOnSale = await marketContract.methods
    .ListMarketItemsOnSale(eventId)
    .call();

  return res.json({ marketItemsOnSale });
});

// To get sold MarketItems belong to a given eventId
router.get('market-items-sold', async (req, res) => {
  const eventId = req.query.eventId;

  const marketItemsSold = await marketContract.methods
    .ListMarketItemsSold(eventId)
    .call();

  return res.json({ marketItemsSold });
});

// To list minted NFT's on market
router.post('/sell', auth, async (req, res) => {
  const { tokenID, price } = req.body;
  if (!tokenID || !price) {
    res.status(400).json({ message: 'Bad request' });
    return;
  }
  let { ticketType, amount } = req.body;
  if (!ticketType) ticketType = '';
  if (!amount) amount = 1;

  let tokenInt = tokenID;
  if (isHex(tokenID)) {
    tokenInt = parseInt(tokenID, 16);
  }

  let transactionParameters = {
    to: ContractDetails.MarketContractAddress, // Required except during contract publications.
    from: req.user.publicAddress, // must match user's active address.
    value: web3.utils.toWei('0.01', 'ether'),
  };

  transaction = await marketContract.methods
    .createMarketItem(
      web3.utils.toWei(price, 'ether'),
      ContractDetails.ContractAddress,
      tokenInt,
      ticketType,
      amount
    )
    .encodeABI();

  transactionParameters['data'] = transaction;

  res.json(transactionParameters);
  return;
});

module.exports = router;
