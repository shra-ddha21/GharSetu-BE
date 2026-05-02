import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import app from './app.js';
import { seedServices } from './utils/seedServices.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB().then(() => {
  // Seed default data if needed
  seedServices();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
