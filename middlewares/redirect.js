// middlewares/redirectIfAuthenticated.js
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')
dotenv.config()

function redirectIfAuthenticated(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    
    return next()
  };                 
console.log(token)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dashboard = decoded.role === 'admin'
      ? '/admin/dashboard'
      : '/user';

    return res.redirect(dashboard);
  } catch (err) {
    // Invalid / expired token → wipe cookie and continue
    res.clearCookie('token');
    return next();
  }
};
module.exports = redirectIfAuthenticated