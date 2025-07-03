const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const authenticateToken = require('../../middlewares/checkLog');
const Transaction = require('../../models/Transaction');

// 📥 GET all orders for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/login');
    }

    const transactions = await Order.find({ buyer: user._id })
      .populate('product')
      .populate('seller');

    res.render('orders/index', { title: 'My Orders', transactions, user });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load orders');
    res.redirect('/');
  }
});

// 📤 POST create order after payment success
router.post('/create', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    req.flash('error', 'User not found.');
    return res.redirect('/login');
  }
  const { productId, address, contact, amount, reference, quantity } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product || product.isSold) {
      req.flash('error', 'Product unavailable');
      return res.redirect('/products');
    }

    const order = new Order({
      buyer: user._id,
      seller: product.owner,
      product: product._id,
      amount,
      quantity,
      address,
      contact,
      reference,
      status: 'pending'
    });

    await order.save();

    // Assuming product needs to be marked as sold here, if not already.
    // This part was missing in the original code, adding it for completeness if needed.
    // If product.isSold is set to true when an order is created, it should be here.
    // product.isSold = true;
    // await product.save();


    req.flash('success_msg', 'Order placed successfully');
    res.redirect('/orders');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error placing order');
    res.redirect('/products');
  }
});

// ✅ POST buyer confirms delivery
router.post('/confirm-delivery/:orderId', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || String(order.buyer) !== req.user.userId) {
      req.flash('error', 'Unauthorized or invalid order');
      return res.redirect('/orders');
    }

    if (order.status !== 'shipped') {
      req.flash('error', 'Order not yet shipped');
      return res.redirect('/orders');
    }

    order.status = 'delivered';
    order.buyerConfirmed = true;
    order.sellerPaid = true; // This simulates releasing the funds
    await order.save();

    req.flash('success_msg', 'Delivery confirmed. Seller will be paid.');
    res.redirect('/orders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error confirming delivery');
    res.redirect('/orders');
  }
});

// ❌ DELETE (soft-delete) a product (only if it's your product)
router.post('/delete-product/:productId', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product || String(product.owner) !== req.user.userId) {
      req.flash('error', 'Unauthorized or product not found');
      return res.redirect('/dashboard');
    }

    if (product.isSold) {
      req.flash('error', 'Cannot delete a sold product');
      return res.redirect('/dashboard');
    }

    product.isDeleted = true;
    await product.save();

    req.flash('success_msg', 'Product deleted successfully');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete product');
    res.redirect('/dashboard');
  }
});

// ❌ DELETE an order by the buyer
router.post('/delete-order/:orderId', authenticateToken, async (req, res) => {
  try {
    // Find the order to get product information before deleting
    const order = await Order.findById(req.params.orderId).populate('product'); 
    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/orders');
    }

    // Ensure the logged-in user is the buyer of this order
    if (String(order.buyer) !== req.user.userId) {
      req.flash('error', 'Unauthorized to delete this order.');
      return res.redirect('/orders');
    }

    // Only allow deletion if the order is in 'pending' or 'cancelled' status
    if (order.status !== 'pending' && order.status !== 'cancelled') {
      req.flash('error', `Order cannot be deleted. Current status is '${order.status}'.`);
      return res.redirect('/orders');
    }

    // If the product was marked as sold when the order was placed,
    // revert its 'isSold' status since the order is now being deleted.
    if (order.product && order.product.isSold) {
      order.product.isSold = false;
      await order.product.save();
    }

    // Permanently delete the order from the database
    await Order.findByIdAndDelete(req.params.orderId);

    req.flash('success_msg', 'Order deleted successfully.');
    res.redirect('/orders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete order.');
    res.redirect('/orders');
  }
});

router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch the current user to pass as 'currentUser' to the EJS template
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }

        // Fetch orders where the current user is the seller
        const soldProductsOrders = await Order.find({
            seller: userId, 
        })
        .populate('product') // Populate the product details
        .populate('buyer')   // Populate the buyer details
        .sort({ createdAt: -1 });

        res.render('transactions/index', { // You might want to use a different EJS file name
            title: 'My Sold Products',
            transactions: soldProductsOrders,
            user,
            currentUser: currentUser // Pass the current user object
        });

    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to load sold products');
        res.redirect('/');
    }
});

// Seller marks an order as shipped
router.post('/mark-shipped/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/orders/transactions');
    }

  // Corrected line: Check if the logged-in user is the seller of the order
        if (String(order.seller) !== req.user.userId) {
            req.flash('error', 'You are not authorized to mark this order as shipped.'); // More specific error message
            return res.redirect('/sold-products'); // Redirect to sold products page
        }

    if (order.status !== 'completed') {
      req.flash('error', 'Order must be completed before shipping');
      return res.redirect('/orders/transactions');
    }

    order.status = 'shipped';
    console.log(order)
    await order.save();

    req.flash('success', 'Marked as shipped');
    res.redirect('/orders/transactions');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('orders/transactions');
  }
});

module.exports = router;
