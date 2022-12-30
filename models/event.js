const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
  description: String,
  logo: String,
  banner: String,
});

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
