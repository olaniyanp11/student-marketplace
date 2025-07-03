const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  reference: { type: String, unique: true },
  userEmail: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' } // Link to order
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
