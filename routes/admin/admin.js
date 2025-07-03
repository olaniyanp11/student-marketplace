const authenticateToken = require("../../middlewares/checkLog");
const requireRole = require("../../middlewares/checkrole");
const Order = require("../../models/Order");
const User = require("../../models/User");
const Product = require('../../models/Product');
const Review = require('../../models/Review');
const express = require('express')
const router = express.Router();
const fs = require('fs');
const path = require('path');





router.get('/dashboard', authenticateToken,  async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
  if (user.role !== 'admin') {
        req.flash('error', 'Access Denied');
        return res.redirect('/admin/dashboard');
      }
    const [productCount, orderCount, revenueResult, userCount] = await Promise.all([
      Product.countDocuments({}),
      Order.countDocuments({}),
      Order.aggregate([
        { $match: { status: {$in :['completed', 'delivered', 'shipped'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      User.countDocuments()
    ]);

    const revenue = revenueResult[0]?.total || 0;

    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('buyer');

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      buyerName: order.buyer?.name || 'Unknown',
      total: order.amount || 0,
      status: order.status,
      createdAt: order.createdAt
    }));

    res.render('protected/admin/dashboard', {
      title: 'Admin Dashboard',
      user,
      stats: {
        products: productCount,
        orders: orderCount,
        revenue,
        users: userCount
      },
      orders: formattedOrders,
      messages: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/');
  }
});


router.get('/users', authenticateToken, async(req,res)=>{
try {
     const userId = req.user.userId;
      const user = await User.findById(userId);
      
      if (!user) {
        req.flash('error', 'User not found.');
        return res.redirect('/logout');
      }
      const users = await User.find();
  if (!users) {
        req.flash('error', 'Error Getting Users ');
        return res.redirect('/admin/dashboard');
      }
        if (user.role !== 'admin') {
        req.flash('error', "Access Denied")
      return res.redirect('/')
      }
      return res.render('protected/admin/users', {
        user,
        title : "All Users Page",
        users
      })
} catch (error) {
        req.flash('error', "error Feting Users ")
        return res.redirect('/admin/dashboard')
}
 
})




// DELETE user by ID
router.post('/users/:id/delete', authenticateToken,  async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    // Find user
    const user = await User.findById(userIdToDelete);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }
         const userId = req.user.userId;
      const admin = await User.findById(userId);
    if (admin.role !== 'admin') {
      req.flash('error', "Access Denied")
      return res.redirect('/')
      }
    // Find products owned by user
    const products = await Product.find({ owner: userIdToDelete });

    // Delete product images from file system
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        product.images.forEach(imageFilename => {
          const imagePath = path.join(__dirname, '../../uploads', imageFilename);
          fs.unlink(imagePath, err => {
            if (err) console.warn(`⚠️ Could not delete image ${imageFilename}:`, err.message);
          });
        });
      }
    }

    // Delete user's products
    await Product.deleteMany({ owner: userIdToDelete });
    await Review.deleteMany({ reviewer: userIdToDelete });


    // Optionally delete orders related to user (as seller or buyer)
    await Order.deleteMany({ $or: [{ seller: userIdToDelete }, { buyer: userIdToDelete }] });

    // Finally delete user
    await User.findByIdAndDelete(userIdToDelete);

    req.flash('success', 'User and related data deleted successfully.');
    res.redirect('/admin/users');
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    req.flash('error', 'An error occurred while deleting the user.');
    res.redirect('/admin/users');
  }
});


router.get('/orders', authenticateToken,  async (req, res) => {
  try {
        const userId = req.user.userId;
    const user = await User.findById(userId);
  if (user.role !== 'admin') {
        req.flash('error', 'Access Denied');
        return res.redirect('/admin/dashboard');
      }
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate('buyer seller product');
        if (user.role !== 'admin') {
        req.flash('error', 'Access Denied');
        return res.redirect('/admin/dashboard');
      }

    res.render('protected/admin/order', {
      title: 'All Orders',
      user: req.user,
      orders
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not fetch orders.');
    res.redirect('/admin/dashboard');
  }
});
// GET /admin/orders/:orderId
router.get('/:orderId', authenticateToken,async (req, res) => {
  try {
     const userId = req.user.userId;
    const user = await User.findById(userId);
  if (user.role !== 'admin') {
        req.flash('error', 'Access Denied');
        return res.redirect('/admin/dashboard');
      }
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate('buyer seller product');

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect('/admin/orders');
    }

    res.render('protected/admin/view-order', {
      title: 'View Order',
      user: req.user,
      order
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load order.');
    res.redirect('/admin/orders');
  }
});

module.exports = router

