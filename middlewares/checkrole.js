// middleware/roleCheck.js
function requireRole(role){
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      return next();
    }
    req.flash('error', "Access Denied")
    return res.redirect('/')
  };
};

module.exports = requireRole