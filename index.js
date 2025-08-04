import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App setup
const app = express();
dotenv.config();

// Middleware

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

app.use(cors({
  origin: 'http://localhost:5173', // your frontend URL
  credentials: true,              // <-- allow cookies to be sent
}));


// Serve static files (optional - usually handled by Vite)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// API Routes for website
import userRoutes from './routes/user.js';
import authRoutes from "./routes/auth.js"
import companyRoutes from "./routes/Company.js"
import deviceRoutes from "./routes/device.js"
import vehicleRoute from "./routes/vehicle.js"
import terminalRoute from "./routes/terminal.js"
import driverRoutes from './routes/driver.js';

// API Routes for app
import appauthRoutes from "./routes/app/auth.js"


// API Routes calling for website
app.use('/api/user', userRoutes); // handling user login here
app.use('/api/auth', authRoutes); // logined user ke jwt me se username ko frontend me show kar rahe h
app.use('/api/company', companyRoutes) // add company wala route
app.use('/api/device', deviceRoutes); // this is for adding the devices
app.use('/api/vehicle', vehicleRoute);
app.use('/api/terminal', terminalRoute);
app.use('/api/driver', driverRoutes);

// API Routes calling for app
app.use('/api/auth', appauthRoutes);


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
