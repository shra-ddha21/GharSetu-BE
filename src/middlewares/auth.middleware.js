import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'my_super_secret_jwt_key_123!';

export const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, SECRET, { expiresIn: '7d' });
};

export const authMiddleware = (roles) => {
  return (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Unauthorized, no token' });
      return;
    }

    try {
      const decoded = jwt.verify(token, SECRET);
      req.user = decoded;

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }

      next();
    } catch (error) {
      res.status(401).json({ message: 'Unauthorized, invalid token' });
    }
  };
};