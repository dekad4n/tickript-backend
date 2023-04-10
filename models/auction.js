const mongoose = require('mongoose');
var AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const auctionSchema = new Schema({
  ticketId: {
    type: Number,
  },
  auctionId: {
    type: Number,
  },
  eventId: {
    type: Number,
  },
  finished: {
    type: Boolean,
    default: false,
  },
});

auctionSchema.plugin(AutoIncrement, {
  id: 'auction_seq',
  inc_field: 'auctionId',
});
const Auction = mongoose.model('Auction', auctionSchema);
module.exports = Auction;
