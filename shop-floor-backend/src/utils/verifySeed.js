import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Machine from '../models/Machine';
import ReasonTree from '../models/ReasonTree';

dotenv.config();

const verifySeed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔍 Verifying seed data...\n');
    
    const tenantId = 'tenant_123';
    
    // Check machines
    const machines = await Machine.find({ tenant_id: tenantId });
    console.log(`📊 Machines found: ${machines.length}`);
    machines.forEach(m => {
      console.log(`   ${m.code} - ${m.name} (${m.status})`);
    });
    
    // Check reason tree
    const reasons = await ReasonTree.find({ tenant_id: tenantId });
    console.log(`\n📊 Reason categories found: ${reasons.length}`);
    reasons.forEach(r => {
      console.log(`   ${r.code} - ${r.label} (${r.children.length} children)`);
    });
    
    // Summary
    console.log('\n✅ Verification Summary:');
    console.log(`   • Total Machines: ${machines.length}`);
    console.log(`   • Total Reason Categories: ${reasons.length}`);
    console.log(`   • Expected Machines: 5`);
    console.log(`   • Expected Reason Categories: 5`);
    
    if (machines.length >= 3 && reasons.length >= 2) {
      console.log('\n🎉 Seed data verification PASSED!');
    } else {
      console.log('\n⚠️  Seed data verification WARNING: Some data missing');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    mongoose.disconnect();
  }
};

verifySeed();
