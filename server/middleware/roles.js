exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. This action requires one of: ${roles.join(', ')}.`
    });
  }
  next();
};
