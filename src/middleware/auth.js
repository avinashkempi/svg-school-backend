const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, payload) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    // Attach decoded payload to req.user. Payload includes role when issued from authController.
    req.user = payload;
    next();
  });
};

// Optional authentication middleware - sets req.user if token is valid, else null
const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, payload) => {
    if (err) {
      req.user = null;
    } else {
      req.user = payload;
    }
    next();
  });
};

// Middleware to allow only admin or super admin users
const requireAdmin = (req, res, next) => {
  // Ensure token was verified and req.user exists
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  const { role } = req.user;
  if (role === 'admin' || role === 'super admin') return next();

  return res.status(403).json({ success: false, message: 'Admin privileges required' });
};

// Middleware to allow specific roles
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    if (roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
  };
};

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  requireAdmin,
  checkRole
};
