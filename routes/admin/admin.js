const authenticateToken = require("../../middlewares/checkLog");
const requireRole = require("../../middlewares/checkrole");
const Order = require("../../models/Order");
const User = require("../../models/User");
const Product = require('../../models/Product');
const express = require('express')
const router = express.Router();




router.get(['/dashboard', '/admin/dashboard'], authenticateToken,  async (req, res) => {
  try {

    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/login');
    }
    if (user.role !== 'admin') {
      req.flash('error', "Access Denied")
    return res.redirect('/')
    }
 

    // Fetch dynamic stats
    const [productCount, orderCount, revenue, userCount] = await Promise.all([
      Product.countDocuments({ owner: userId }),
      Order.countDocuments({ seller: userId }),
      Order.aggregate([
        { $match: { seller: user._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      User.countDocuments()
    ]);

    const stats = {
      products: productCount,
      orders: orderCount,
      revenue: revenue[0]?.total || 0,
      users: userCount
    };

    // Fetch recent orders made to this seller
const orders = await Order.find({ seller: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('buyer').populate('seller'); // This population is still necessary to get the buyer object

    console.log(orders[0]); // Safely log to check if buyer exists for the first order

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      // Use optional chaining (?.) and nullish coalescing (||) for safety
      buyerName: order.buyer?.name || 'Unknown',
      total: order.amount || 0,
      status: order.status.toUpperCase(),
      createdAt: order.createdAt
    }));
console.log(formattedOrders[0])
    res.render('protected/admin/dashboard', {
      title: 'Dashboard',
      user,
      stats,
      orders: formattedOrders
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Something went wrong.');
    res.redirect('/login');
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

module.exports = router

