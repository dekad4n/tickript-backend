const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ticketSchema = new Schema({
  tokenId: {
    type: Number,
    required: true,
  },
  checked: {
    type: Boolean,
    required: true,
  },
  controllerAddress: {
    type: String,
    required: true,
  },
});

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
