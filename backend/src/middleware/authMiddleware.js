const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-compliance-key';

exports.authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'auditor'].includes((req.user.role || '').toLowerCase())) {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin or Auditor access required' });
  }
  next();
};

exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};
