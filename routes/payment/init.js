const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const Product = require('../../models/Product');
const Order = require('../../models/Order');
const authenticateToken = require('../../middlewares/checkLog');
const getUser = require('../../middlewares/getUser');

// INITIATE PAYMENT
router.post('/init', authenticateToken, getUser, async (req, res) => {
  try {
    let { email, productId, amount, quantity } = req.body;
    const user = req.user;

    const product = await Product.findById(productId).populate('owner');
    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/user');
    }

    if (product.isSold || product.quantity < quantity) {
      req.flash('error', 'Insufficient stock or item is sold out.');
      return res.redirect('/user');
    }
    console.log(product.owner._id +"     " + user._id)
    if(product.owner._id.equals(user._id)){
      req.flash('error', 'You cant Buy Your Own Products');
      return res.redirect('/user');
    }
    const existingPendingOrder = await Order.findOne({
      buyer: user._id,
      product: product._id,
      status: 'pending'
    });

    if (existingPendingOrder) {
      req.flash('error', 'You already have a pending payment for this product.');
      return res.redirect('/user');
    }
amount = amount * quantity
    const reference = uuidv4();

    await new Order({
      buyer: user._id,
      seller: product.owner._id,
      product: product._id,
      amount,
      quantity,
      reference,
      status: 'pending'
    }).save();

    const BASE_URL = process.env.BASE_URL;
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100,
        reference,
        callback_url: `${BASE_URL}/payments/verify`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const authUrl = response.data.data.authorization_url;
    return res.redirect(authUrl);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Payment initialization failed.');
    return res.redirect('/user');
  }
});

// VERIFY PAYMENT
router.get('/verify', async (req, res) => {
  try {
    const { reference } = req.query;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const status = response.data.data.status;

    const order = await Order.findOneAndUpdate(
      { reference, status: 'pending' },
      { status: status === 'success' ? 'completed' : 'cancelled' },
      { new: true }
    );

    if (!order) {
      req.flash('error_msg', 'Order not found or already processed.');
      return res.redirect('/user');
    }

    if (status === 'success') {
      const product = await Product.findById(order.product);

      if (!product || product.quantity < order.quantity) {
        req.flash('error_msg', 'Product out of stock or not available.');
        return res.redirect('/user');
      }

      product.quantity -= order.quantity;

      if (product.quantity === 0) {
        product.isSold = true;
      }

      await product.save();

      req.flash('success_msg', 'Payment successful! Thank you.');
    } else {
      req.flash('error_msg', 'Payment failed or was cancelled.');
    }

    return res.redirect('/user');
  } catch (err) {
    console.error(err.message);
    req.flash('error_msg', 'Transaction verification failed: ' + err.message);
    return res.redirect('/user');
  }
});

module.exports = router;
