const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  name: String,
  username: String,
  nonce: String,
});

const User = mongoose.model('User', userSchema);
module.exports = User;
