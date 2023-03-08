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
  const contract = req.query['contract'];
  const token = req.query['token'];

  if (!contract || !token) {
    res.status(400);
    res.json({ message: 'Contract address or token is not valid!' });
    return;
  }

  const result = await getNFTMetadata(contract, token);
  if (Object.keys(result).length === 0) {
    res.status(404);
    res.json({ message: 'Could not found such ticket' });
    return;
  }
  res.status(200);
  res.json({ result: result });
});

router.post('/mint', auth, uploadmw.any(), async (req, res) => {
  const { name, image, eventId } = req.body;
  let { amount } = req.body;
  if (!amount) amount = 1;

  const img_buffer = Buffer.from(image, 'base64');

  let imageUploadRes = await uploadFromBuffer(img_buffer);

  if (!imageUploadRes || imageUploadRes.Status != 'Success') {
    console.error({ message: 'Unable to pin image to IPFS' });
    res.json({ message: 'Unable to pin image to IPFS' });
    return;
  }

  let img_hash = imageUploadRes.IpfsHash;
  console.log('img_hash:', img_hash);

  let send_json = {
    name: name,
    image: 'ipfs://' + img_hash,
  };

  const json_buffer = Buffer.from(JSON.stringify(send_json), 'utf-8');

  let jsonUploadRes = await uploadFromBuffer(json_buffer);

  if (!jsonUploadRes || jsonUploadRes.Status != 'Success') {
    console.error({ message: 'Unable to pin JSON to IPFS' });
    res.json({ message: 'Unable to pin JSON to IPFS' });
    return;
  }

  let json_hash = jsonUploadRes.IpfsHash;
  console.log('json_hash:', json_hash);

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
    console.log('res:', res);
    return res.data;
  } catch (error) {
    console.log(error);
  }
};

async function uploadJSON(data_buffer) {
  try {
    console.log(data_buffer);

    const url = `https://api.pinata.cloud/pinning/pinJSONtoIPFS`;

    console.log(hash, 'hash');

    let response = await axios.post(url, data_buffer, {
      maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large files
      headers: {
        'Content-Type': `application/json; boundary=${data_buffer._boundary}`,
        pinata_api_key: process.env['PINATA_API_KEY'],
        pinata_secret_api_key: process.env['PINATA_SECRET_API_KEY'],
      },
    });

    console.log(response.data, 'data');

    return response.data.hash;
  } catch (err) {
    console.log('Error');
    console.log(err);
  }
}

module.exports = router;
