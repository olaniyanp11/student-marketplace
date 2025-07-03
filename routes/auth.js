const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/checkLog');
const redirectIfAuthenticated = require('../middlewares/redirect');
const getUser = require('../middlewares/getUser');
const dotenv = require('dotenv').config()
const multer = require('multer')
const crypto = require('crypto');
const mongoose = require('mongoose');

// Pages

const path = require('path');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Multer config for profilePic uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'public/images/user'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, req.user.userId + '-profile-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

router.get('/',getUser, async (req, res) => {
console.log(req.user)
 user = req.user
        if (!user) {
                user= null; // Or show an unauthorized page
          }
    res.render('index', { title: 'Home',user });
});

router.get('/register',redirectIfAuthenticated, (req, res) => {
    res.render('register', { title: 'Register',user:null  });
});

router.get('/login', redirectIfAuthenticated,(req, res) => {
    res.render('login', { title: 'Login',user:null });
});

// POST /register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email already exists.');
            return res.redirect('/register');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long.');
            return res.redirect('/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        req.flash('success', 'Account created successfully. Please login.');
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while registering.');
        res.redirect('/register');
    }
});

// POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });

        req.flash('success', 'Welcome back!');
        if (user.role === 'admin')  return res.redirect('/admin/dashboard');
       return res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while logging in.');
        res.redirect('/login');
    }
});

// GET /dashboard
router.get(['/dashboard', '/user'], authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/logout');
    }

    // Fetch dynamic stats
    const [productCount, orderCount, revenueAgg, userCount] = await Promise.all([
      Product.countDocuments({ owner: userId }),
      Order.countDocuments({ seller: userId }),
Order.aggregate([
  { $match: { seller: user._id, status: { $in: ['completed', 'delivered', 'shipped'] } } },
  { $group: { _id: null, total: { $sum: '$amount' } } }
]),
      User.countDocuments()
    ]);

    // revenueAgg is an array, if not empty, revenueAgg[0].total is the sum of ALL completed orders
    const stats = {
      products: productCount,
      orders: orderCount,
      revenue: revenueAgg.length > 0 ? revenueAgg[0].total : 0,
      users: userCount
    };

    // Fetch recent orders made to this seller
    const orders = await Order.find({ seller: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('buyer').populate('seller');

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      buyerName: order.buyer?.name || 'Unknown',
      total: order.amount || 0,
      status: order.status.toUpperCase(),
      createdAt: order.createdAt
    }));

    res.render('protected/dashboard', {
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

// GET: Profile Edit Form
router.get(['/user/profile/edit', '/admin/profile/edit'], authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    req.flash('error_msg', 'User not found.');
    return res.redirect('/login');
  }
  res.render('protected/profile-edit', { title: 'Edit Profile', user });
});

// POST: Update Profile
router.post(['/user/profile/edit', '/admin/profile/edit'], authenticateToken, upload.single('profilePic'), async (req, res) => {
  try {
    const { name, email } = req.body;

    const updateData = { name, email };
    if (req.file) {
      updateData.profilePic = '/images/user/' + req.file.filename;
    }

    await User.findByIdAndUpdate(req.user.userId, updateData, {
      new: true,
      runValidators: true
    });

    req.flash('success_msg', 'Profile updated successfully.');
    res.redirect('/user/profile');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to update profile.');
    res.redirect('/user/profile/edit');
  }
});
router.get('/profile', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    req.flash('error_msg', 'User not found.');
    return res.redirect('/login');
  }
  res.render('protected/profile', { title: 'Your Profile', user });
});

// GET /logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.flash('success', 'You have logged out.');
    res.redirect('/login');
});

module.exports = router;
