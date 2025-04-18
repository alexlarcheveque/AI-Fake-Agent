import express from 'express';
import leadRoutes from '../routes/leadRoutes.js';
import messageRoutes from '../routes/messageRoutes.js';
import settingsRoutes from '../routes/settingsRoutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';
import { auth } from '../middleware/auth.js';
import cors from 'cors';

const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Apply auth middleware to all API routes
app.use('/api/leads', auth, leadRoutes);
app.use('/api/messages', auth, messageRoutes);
app.use('/api/settings', auth, settingsRoutes);
app.use('/api/notifications', auth, notificationRoutes);

export default app;
