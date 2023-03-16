const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  image: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  parentName: String,
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
