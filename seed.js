import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

// --- Minimal inline schemas to avoid dependency issues ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
  role: { type: String, default: 'user' }, phone: String, address: String,
}, { timestamps: true }));

const Provider = mongoose.models.Provider || mongoose.model('Provider', new mongoose.Schema({
  businessName: String, ownerName: String,
  email: { type: String, unique: true }, password: String,
  phone: String, serviceType: String, servicesOffered: [String],
  experience: Number, description: String, location: String,
  address: { street: String, state: String, district: String, city: String, pincode: String },
  coordinates: { lat: Number, lng: Number },
  profileImage: { url: String, publicId: String },
  governmentId: {
    idType: String,
    frontImage: { url: String, publicId: String },
    backImage:  { url: String, publicId: String },
  },
  phoneVerified: { type: Boolean, default: false },
  isVerifiedProfile: { type: Boolean, default: false },
  completionPercentage: { type: Number, default: 0 },
  status: { type: String, default: 'approved' },
  role: { type: String, default: 'provider' },
}, { timestamps: true }));

const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  requirement: String, preferredDate: Date,
  selectedProviders: [mongoose.Schema.Types.ObjectId],
  assignedProviderId: mongoose.Schema.Types.ObjectId,
  status: { type: String, default: 'pending' },
  isLocked: { type: Boolean, default: false },
}, { timestamps: true }));

const CATEGORIES = [
  { name: "Labour / Workforce (कामगार)", services: ["Plumber (प्लंबर)", "Electrician (इलेक्ट्रिशियन)", "Painter (पेंटर)", "Carpenter (सुतार)", "Mason / Gavandi (गवंडी)"] },
  { name: "Professionals / Consultants (व्यावसायिक सेवा)", services: ["Architect (आर्किटेक्ट)", "Contractor (कॉन्ट्रॅक्टर)", "Interior Designer", "Structural Designer"] },
  { name: "Specialized Services (विशेष सेवा)", services: ["Waterproofing", "Pest Control", "CCTV Installation", "Solar Installation"] },
  { name: "Equipment & Heavy Services", services: ["Earthmovers (JCB, Excavator)", "Equipment Rental", "Tools Rental"] },
  { name: "Construction Materials (साहित्य)", services: ["Cement", "Steel", "Bricks", "Tiles / Paving Blocks"] },
  { name: "Home Improvement & Retail (घरगुती साहित्य)", services: ["Furniture", "Doors & Windows", "Home Décor"] },
  { name: "Interior & Finishing Services", services: ["Modular Kitchen", "Interior Execution", "Furniture Work"] }
];

const CITIES = [
  { city: "Pune", district: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Mumbai", district: "Mumbai City", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
  { city: "Nashik", district: "Nashik", state: "Maharashtra", lat: 19.9975, lng: 73.7898 },
  { city: "Aurangabad", district: "Aurangabad", state: "Maharashtra", lat: 19.8762, lng: 75.3433 },
  { city: "Nagpur", district: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 }
];

const NAMES = ["Rahul", "Amit", "Suresh", "Ganesh", "Mahesh", "Priya", "Sneha", "Anil", "Sunil", "Vikram"];
const SURNAMES = ["Patil", "Desai", "Sharma", "Kulkarni", "Jadhav", "Shinde", "More", "Pawar", "Bhosale", "Rathod"];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gharsetu');
    console.log('✅ Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('Test@1234', 10);
    const placeholderImg = { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', publicId: 'dummy_p' };

    // 1. Seed Users
    console.log('👤 Seeding Users...');
    const seededUsers = [];
    for (let i = 0; i < 10; i++) {
      const name = `${NAMES[i]} ${SURNAMES[i]}`;
      const email = `user${i}@example.com`;
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({ name, email, password: hashedPassword, role: 'user', phone: `987654321${i}` });
      }
      seededUsers.push(user);
    }

    // 2. Seed Providers
    console.log('🏗️ Seeding Providers (5+ per category)...');
    const seededProviders = [];
    let providerIdx = 0;
    for (const cat of CATEGORIES) {
      console.log(`   - Category: ${cat.name}`);
      for (let i = 0; i < 6; i++) {
        const cityData = CITIES[i % CITIES.length];
        const ownerName = `${NAMES[(providerIdx + i) % 10]} ${SURNAMES[(providerIdx + i) % 10]}`;
        const businessName = `${SURNAMES[(providerIdx + i) % 10]} ${cat.services[i % cat.services.length].split(' (')[0]} Services`;
        const email = `provider${providerIdx}@example.com`;
        
        let provider = await Provider.findOne({ email });
        if (!provider) {
          provider = await Provider.create({
            businessName,
            ownerName,
            email,
            password: hashedPassword,
            phone: `91234567${providerIdx.toString().padStart(2, '0')}`,
            serviceType: cat.services[i % cat.services.length],
            servicesOffered: [cat.services[i % cat.services.length], ...cat.services.slice(0, 2)],
            experience: 3 + (providerIdx % 15),
            description: `Professional ${cat.services[i % cat.services.length]} service with years of experience in ${cityData.city}.`,
            address: { 
              street: `Main Road, Shop No ${10+i}`, 
              state: cityData.state, 
              district: cityData.district, 
              city: cityData.city, 
              pincode: `4110${providerIdx + 10}` 
            },
            coordinates: { lat: cityData.lat + (Math.random() * 0.02 - 0.01), lng: cityData.lng + (Math.random() * 0.02 - 0.01) },
            status: 'approved',
            phoneVerified: true,
            isVerifiedProfile: true,
            completionPercentage: 100,
            profileImage: placeholderImg,
            role: 'provider'
          });
        }
        seededProviders.push(provider);
        providerIdx++;
      }
    }

    // 3. Seed Requests
    console.log('📋 Seeding Requests...');
    const statuses = ['pending', 'assigned', 'completed', 'in-progress'];
    for (let i = 0; i < 15; i++) {
      const user = seededUsers[i % seededUsers.length];
      const prov = seededProviders[i % seededProviders.length];
      await Request.create({
        userId: user._id,
        requirement: `Need urgent ${prov.serviceType} for my home in ${prov.address.city}.`,
        preferredDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)),
        selectedProviders: [prov._id],
        assignedProviderId: i % 2 === 0 ? prov._id : null,
        status: statuses[i % statuses.length],
      });
    }

    console.log('\n✅ Seeding complete!');
    console.log(`📊 Users: ${seededUsers.length}, Providers: ${seededProviders.length}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding:', err);
    process.exit(1);
  }
}

seed();
