const recoverPersonalSignature = require('eth-sig-util');
const express = require('express');
const { json } = require('express/lib/response');
const User = require('../models/user');
const router = express.Router();
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const auth = require('../middlewares/auth');

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

async function authenticate(nonce, signature) {
  try {
    const address = recoverPersonalSignature.recoverPersonalSignature({
      data: nonce,
      sig: signature,
    });
    let user = await User.findOne({
      publicAddress: address,
      nonce: nonce,
    });
    if (user == null) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

router.post('/login', async (req, res) => {
  // Exists at the backend but lost the access token
  console.log(req.session);
  if (req.session && req.session.user != null) {
    let re = req.session.user;
    re['token'] = generateAccessToken(req.session.user.publicAddress);

    // Check if the user is event organiser (whitelisted)
    const isWhitelisted = await MintContract.methods
      .verifyEventOwner(re.session.user.publicAddress)
      .call();

    console.log('isWhitelisted:', isWhitelisted);

    res.json({ token: re.token, isWhitelisted: isWhitelisted }); //TODO: Change the structure
    return;
  }

  const { nonce, signature } = req.body;

  if (nonce == null || signature == null) {
    res.sendStatus(401);
    return;
  }

  authenticate(nonce, signature)
    .then(async (user) => {
      if (user == null) {
        res.sendStatus(401);
        return;
      }

      // Successful login
      req.session.user = user;

      // Check if the user is event organiser (whitelisted)
      const isWhitelisted = await MintContract.methods
        .verifyEventOwner(user.publicAddress)
        .call();

      console.log('isWhitelisted:', isWhitelisted);

      res.json({
        token: generateAccessToken(user.publicAddress),
        isWhitelisted: isWhitelisted,
      });
    })
    .catch((err) => {
      console.log('Auth error', err);
      res.sendStatus(401);
    });
});

router.get('/check', auth, async (req, res) => {
  res.json({ user: req.user });
});

function generateAccessToken(username) {
  return jwt.sign({ username: username }, process.env['JWT_SECRET'], {
    expiresIn: '1000d',
  });
}

module.exports = router;
