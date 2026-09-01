// =============================================
// SETUP SCRIPT - Add Office Location & Test Data
// =============================================
// Run this once to initialize your system with the office location

import mongoose from 'mongoose';
import OfficeLocation from '../models/officeLocation.model.js';
import dotenv from 'dotenv';

dotenv.config();

const officeLocationData = {
  name: 'Main Office',
  latitude: 12.5188125,
  longitude: 78.2333125,
  radiusKm: 0.5,
  address: '320/1, Thiruvannamalai Rd, near Maharishi School last building, Giddampatti, Tamil Nadu 635001',
  city: 'Giddampatti',
  country: 'India (Tamil Nadu)',
  organization: null, // Global fallback for all organizations
};

const seedOfficeLocation = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your_db_name');
    console.log('✓ Connected to MongoDB');

    // Check if location already exists
    const existing = await OfficeLocation.findOne({ name: 'Main Office' });
    if (existing) {
      console.log('ℹ Office location already exists. Updating...');
      existing.latitude = officeLocationData.latitude;
      existing.longitude = officeLocationData.longitude;
      existing.radiusKm = officeLocationData.radiusKm; // 500 meters
      existing.address = officeLocationData.address;
      existing.city = officeLocationData.city;
      existing.country = officeLocationData.country;
      existing.organization = officeLocationData.organization;
      existing.isActive = true;
      await existing.save();
      console.log('✓ Office location updated');
    } else {
      // Create new office location
      const officeLocation = new OfficeLocation({
        name: officeLocationData.name,
        latitude: officeLocationData.latitude,
        longitude: officeLocationData.longitude,
        radiusKm: officeLocationData.radiusKm, // 500 meters - adjust if needed
        address: officeLocationData.address,
        city: officeLocationData.city,
        country: officeLocationData.country,
        isActive: true,
        organization: officeLocationData.organization,
      });

      await officeLocation.save();
      console.log('✓ Office location created successfully!');
    }

    console.log('\n📍 OFFICE LOCATION DETAILS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name: Main Office`);
    console.log(`Latitude: ${officeLocationData.latitude}`);
    console.log(`Longitude: ${officeLocationData.longitude}`);
    console.log(`Address: ${officeLocationData.address}`);
    console.log(`Plus Code: G69M+G8 Giddampatti, Tamil Nadu`);
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
