const mongoose = require('mongoose');
var AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  owner: {
    type: String,
    required: true,
  },
  coverImageURL: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  integerId: {
    type: Number,
  },
});

eventSchema.plugin(AutoIncrement, { id: 'order_seq', inc_field: 'integerId' });
const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
