const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secretcode';

module.exports = function(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const tokenPart = token.split(' ')[1] || token;
    const decoded = jwt.verify(tokenPart, JWT_SECRET);
    req.user = decoded;
    next();
  } catch(err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
