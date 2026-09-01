// =============================================
// SETUP SCRIPT - Add Office Location & Test Data
// =============================================
// Run this once to initialize your system with the office location

import mongoose from 'mongoose';
import OfficeLocation from '../models/officeLocation.model.js';
import dotenv from 'dotenv';

dotenv.config();

const seedOfficeLocation = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your_db_name');
    console.log('✓ Connected to MongoDB');

    // Check if location already exists
    const existing = await OfficeLocation.findOne({ name: 'Main Office' });
    if (existing) {
      console.log('ℹ Office location already exists. Updating...');
      existing.latitude = 12.517304;
      existing.longitude = 78.232888;
      existing.radiusKm = 0.5; // 500 meters
      existing.address = 'unnamed road, Krishnagiri';
      existing.city = 'Vettiyampatti';
      existing.country = 'India';
      existing.isActive = true;
      await existing.save();
      console.log('✓ Office location updated');
    } else {
      // Create new office location
      const officeLocation = new OfficeLocation({
        name: 'Main Office',
        latitude: 12.517304,
        longitude: 78.232888,
        radiusKm: 0.5, // 500 meters - adjust if needed
        address: 'unnamed road, Krishnagiri',
        city: 'Vettiyampatti',
        country: 'India (Tamil Nadu)',
        isActive: true,
        organization: null, // Will work for all organizations
      });

      await officeLocation.save();
      console.log('✓ Office location created successfully!');
    }

    console.log('\n📍 OFFICE LOCATION DETAILS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name: Main Office`);
    console.log(`Latitude: 12.517304`);
    console.log(`Longitude: 78.232888`);
    console.log(`Address: Krishnagiri, Vettiyampatti`);
    console.log(`Allowed Radius: 500 meters`);
    console.log(`Status: Active`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n✓ Setup Complete!');
    console.log('\nNow you can:');
    console.log('1. Users can submit WFH requests');
    console.log('2. Managers can approve/reject WFH');
    console.log('3. Employees can clock in with GPS');
    console.log('   - If WFH approved → No GPS verification needed ✓');
    console.log('   - If normal day → Must be within 500m of office ✓');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedOfficeLocation();
