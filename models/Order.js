

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  amount: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['pending', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  reference: { type: String, required: true },
  address: { type: String },
  contact: { type: String },
  buyerConfirmed: { type: Boolean, default: false }, // New field
  sellerPaid: { type: Boolean, default: false }      // New field
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);

