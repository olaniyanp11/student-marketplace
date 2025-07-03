const express  = require('express');
const router   = express.Router();
const Product  = require('../../models/Product');
const path     = require('path');
const multer   = require('multer');
const User = require('../../models/User');
const authenticateToken = require('../../middlewares/checkLog');
const crypto = require('crypto')


/* ─── multer setup ───────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'public/images/products'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, req.user.userId + '-profile-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });


router.get('/create', authenticateToken, async(req, res) => {
 const user = await User.findById(req.user.userId);
            if (!user) {
              req.flash('error', 'User not found.');
              return res.redirect('/login');
            }
  res.render('products/create', { title: 'Add Product', user });
});


router.post('/create', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category, quantity } = req.body;

    const product = await Product.create({
      owner: req.user.userId,
      title,
      description,
      price,
      category,
      quantity,
      image: req.file ? '/images/products/' + req.file.filename
                      : '/images/products/default.jpg'
    });

    req.flash('success', 'Product listed!');
    res.redirect('/products/my');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create product.');
    res.redirect('/products/create');
  }
});

/* ─── LIST ALL PRODUCTS ──────────────────────────────────── */
router.get('/all',authenticateToken, async (req, res) => {
     const user = await User.findById(req.user.userId);
            if (!user) {
              req.flash('error', 'User not found.');
              return res.redirect('/login');
            }
  const products = await Product.find().populate('owner');
  res.render('products/all', { title: 'All Products', products,user });
});

/* ─── LIST MY PRODUCTS ───────────────────────────────────── */
router.get('/my', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/login');
    }
  const products = await Product.find({ owner: req.user.userId });
  res.render('products/my-product', { title: 'My Products', products,user });
});

/* ─── SHOW SINGLE PRODUCT ───────────────────────────────── */
router.get('/:id',authenticateToken, async (req, res) => {
         const user = await User.findById(req.user.userId);
            if (!user) {
              req.flash('error', 'User not found.');
              return res.redirect('/login');
            }
  const product = await Product.findById(req.params.id).populate('owner');
  if (!product) return res.status(404).render('404');
  res.render('products/show', { title: product.title, product,user });
});

router.post('/:id/delete', authenticateToken, async (req, res) => {
         try {
            const user = await User.findById(req.user.userId);
            if (!user) {
              req.flash('error', 'User not found.');
              return res.redirect('/login');
            }
  const productId = req.params.id;
  const product = await Product.findOne({ _id: productId, owner: req.user.userId });
  if (!product) {
    req.flash('error', 'Product not found.');
    return res.redirect('/products/my');
  }
  console.log(product);
  // Delete the product image if it exists and is not the default image
  if (product.image ) {
    const imagePath = path.join(__dirname, '../../public', product.image);
    try {
      require('fs').unlinkSync(imagePath);
      console.log(`Image ${product.image} deleted successfully`);
    } catch (err) {
      console.error('Error deleting image:', err);
    }
  }
  await Product.deleteOne({ _id: req.params.id, owner: req.user.userId });
  req.flash('success', 'Product removed');
  res.redirect('/products/my');
         } catch (error) {
           req.flash('error', 'Error deleting product');
              res.redirect('/products/my');
         }
});
router.get('/:id/edit', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, owner: req.user.userId });
    const user = await User.findById(req.user.userId);

    if (!product || !user) {
      req.flash('error', 'Unauthorized access or product not found.');
      return res.redirect('/products/my');
    }

    res.render('products/edit', { title: 'Edit Product', product, user });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading product for edit.');
    res.redirect('/products/my');
  }
});

router.post('/:id/edit', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category, quantity } = req.body;
    const productId = req.params.id;
    const product = await Product.findOne({ _id: productId, owner: req.user.userId });
    if (!product) {
      req.flash('error', 'Product not found or unauthorized');
      return res.redirect('/products/my');
    }

    // Update fields
    product.title = title || product.title;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.quantity = quantity || product.quantity;
    if (quantity >0){
      product.isSold = false;
    }
    // If new image is uploaded
    if (req.file) {
      // Delete old one (except default)
      if (product.image && product.image !== '/images/products/default.jpg') {
        const oldImagePath = path.join(__dirname, '../../public', product.image);
        try {
          require('fs').unlinkSync(oldImagePath);
        } catch (e) {
          console.warn('Could not delete old image:', e.message);
        }
      }
      product.image = '/images/products/' + req.file.filename;
    }

    await product.save();
    req.flash('success', 'Product updated successfully');
    res.redirect('/products/my');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error updating product');
    res.redirect('/products/my');
  }
});

module.exports = router;
