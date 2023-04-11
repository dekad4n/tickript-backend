const mongoose = require('mongoose');
var AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const auctionSchema = new Schema({
  auctionId: {
    type: Number,
  },
  eventId: {
    type: Number,
  },
});

auctionSchema.plugin(AutoIncrement, {
  id: 'auction_seq',
  inc_field: 'auctionId',
});
const Auction = mongoose.model('Auction', auctionSchema);
module.exports = Auction;
