const express = require('express');
const authRoutes = require('./auth');
const userRoute = require('./user')
const router = express.Router();


router.use('/products', require('./product/product'));
router.use('/payments', require('./payment/init'));
router.use('/orders', require('./order/order'));
router.use('/admin', require('./admin/admin'));
router.use("/",authRoutes)
router.use("/user",authRoutes)


module.exports = router;