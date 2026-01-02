// seed.js - Direct connection approach
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Machine from '../models/Machine.js';
import ReasonTree from '../models/ReasonTree.js';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopfloor';
const TENANT_ID = 'tenant_123';

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect directly
    await mongoose.connect(MONGO_URI);
    
    console.log('✅ MongoDB connected');
    
    // Clear data
    console.log('Clearing existing data...');
    await Machine.deleteMany({});
    await ReasonTree.deleteMany({});
    
    // Seed machines
    console.log('Seeding machines...');
    const machines = [
      { name: 'Cutter 1', code: 'M-101', type: 'cutter', status: 'OFF', tenant_id: TENANT_ID },
      { name: 'Roller A', code: 'M-102', type: 'roller', status: 'OFF', tenant_id: TENANT_ID },
      { name: 'Packing West', code: 'M-103', type: 'packer', status: 'OFF', tenant_id: TENANT_ID }
    ];
    await Machine.insertMany(machines);
    console.log('✓ 3 machines seeded');
    
    // Seed reason tree
    console.log('Seeding reason tree...');
    const reasons = [
      {
        code: 'POWER',
        label: 'Power',
        children: [
          { code: 'GRID', label: 'Grid' },
          { code: 'INTERNAL', label: 'Internal' }
        ],
        tenant_id: TENANT_ID
      },
      {
        code: 'CHANGEOVER',
        label: 'Changeover',
        children: [
          { code: 'TOOLING', label: 'Tooling' }
        ],
        tenant_id: TENANT_ID
      }
    ];
    await ReasonTree.insertMany(reasons);
    console.log('✓ 2 reason categories seeded');
    
    console.log('\n✅ Seeding complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message || error);
  } finally {
    console.log('\nClosing connection...');
    await mongoose.connection.close();
    console.log('Seed script finished.');
    process.exit(0);
  }
};

// Run the seed function
seedData();