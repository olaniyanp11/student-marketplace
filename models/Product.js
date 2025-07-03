const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  image: { type: String, default: '/images/products/default.jpg' },
  category: { type: String },
  quantity: { type: Number, default: 1 },
  isSold: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false } 
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);

