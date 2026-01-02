import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import "./src/server.js";

import authRoutes from './src/routes/authRoutes.js';
import machineRoutes from './src/routes/machineRoutes.js';
import downtimeRoutes from './src/routes/downtimeRoutes.js';
import maintenanceRoutes from './src/routes/maintenanceRoutes.js';
import alertRoutes from './src/routes/alertRoutes.js';
import syncRoutes from './src/routes/syncRoutes.js';
import reportRoutes from './src/routes/reportRoutes.js';
import errorHandler from './src/middleware/errorHandler.js'

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Shop Floor Backend API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/downtime', downtimeRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});