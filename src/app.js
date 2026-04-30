import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import providerRoutes from './routes/provider.route.js';
import adminRoutes from './routes/admin.route.js';
import contactRoutes from './routes/contact.route.js';
import errorMiddleware from './middlewares/error.middleware.js';

// Basic route
app.get('/', (req, res) => {
  res.send('GharSetu API is running...');
});

// API Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// Error Middleware
app.use(errorMiddleware);

export default app;
