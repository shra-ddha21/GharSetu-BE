import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Provider } from '../models/Provider.model.js';
import { geocodeLocation } from '../utils/geocode.util.js';

// Load env vars
dotenv.config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all providers with a location but no valid coordinates
    const providers = await Provider.find({
      location: { $exists: true, $ne: '' },
      $or: [
        { 'coordinates.lat': null },
        { 'coordinates.lng': null },
        { coordinates: { $exists: false } }
      ]
    });

    console.log(`Found ${providers.length} providers needing geocoding.`);

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      console.log(`[${i + 1}/${providers.length}] Geocoding: ${provider.location}...`);

      const coords = await geocodeLocation(provider.location);

      if (coords) {
        provider.coordinates = coords;
        await provider.save();
        console.log(`  -> Success: ${coords.lat}, ${coords.lng}`);
      } else {
        console.log(`  -> Failed to geocode`);
      }

      // Nominatim requires 1 second delay between requests
      await sleep(1000);
    }

    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.disconnect();
  }
};

runMigration();
