const express = require('express');
const Hash = require('ipfs-only-hash');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const ContractDetails = require('../contracts/ContractDetails');
const contractABI = require('../contracts/TicketMint.json');
const auth = require('../middlewares/auth');
const multer = require('multer');
const uploadmw = multer();
require('dotenv').config();

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
  console.log(req.query);
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
  const { name, image } = req.body;
  const img_buffer = Buffer.from(image, 'base64');

  let img_hash = await upload(img_buffer);

  if (img_hash.Status != 'Success') {
    return;
  }
  let send_json = {
    name: name,
    image: 'ipfs://' + img_hash.Hash,
  };

  const json_buffer = Buffer.from(JSON.stringify(send_json), 'utf-8');
  let json_hash = await upload(json_buffer);
  // let contract1 = Contract;
  // console.log(contract1);
  let transactionParameters = {};

  try {
    let data = MintContract.methods
      .mintNFT(`ipfs://${json_hash.Hash}`, 1)
      .encodeABI();

    transactionParameters = {
      to: ContractDetails.ContractAddress, // Required except during contract publications.
      from: req.user.publicAddress, // must match user's active address.
      data: data,
    };
    res.json(transactionParameters);
  } catch (e) {
    console.log(e);
    res.json({ fail: true, e: e });
  }
});

async function upload(data_buffer) {
  try {
    console.log(data_buffer);
    let hash = await Hash.of(data_buffer);
    fs.writeFile('/tmp/' + hash, data_buffer, (err) => {
      if (err) {
        console.log('Error while writing to file : ' + hash);
        throw err;
      }
    });

    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    let data = new FormData();
    data.append('file', fs.createReadStream('/tmp/' + hash));

    let response = await axios.post(url, data, {
      maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large files
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: process.env['PINATA_API_KEY'],
        pinata_secret_api_key: process.env['PINATA_SECRET_API_KEY'],
      },
    });

    fs.unlink('/tmp/' + hash, (err) => {
      if (err) {
        console.log('Error while deleting file : ' + hash);
        throw err;
      }
    });

    if (response.data['IpfsHash'] == hash) {
      return {
        Status: 'Success',
        Hash: hash,
      };
    } else {
      throw 'Hash mismatch ' + response.data['IpfsHash'] + '!=' + hash;
    }
  } catch (err) {
    console.log('Error');
    console.log(err);
  }
}

module.exports = router;
