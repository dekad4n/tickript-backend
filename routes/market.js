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

router.post('/sell', auth, async (req, res) => {
  const { contract, tokenID, price } = req.body;
  if (!tokenID || !contract || !price) {
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
    from: req.user.id, // must match user's active address.
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
