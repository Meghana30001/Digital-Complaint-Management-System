const dns = require('dns');
const mongoose = require('mongoose');

// Some networks block or fail SRV lookups for mongodb+srv; public DNS fixes that.
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('\n❌ MONGO_URI is not set in server/.env\n');
    return false;
  }
  if (/<[^>]+>/.test(uri)) {
    console.error('\n❌ MONGO_URI contains <angle brackets> — remove them from username/password.');
    console.error('   Atlas shows placeholders like <password>; use your real password only.\n');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error(`\n❌ MongoDB connection failed: ${err.message}`);
    console.error('💡 To fix:');
    console.error('   1. Free Atlas cloud DB → https://www.mongodb.com/atlas/database');
    console.error('   2. Create M0 free cluster → Get connection string');
    console.error('   3. Paste it in server/.env as MONGO_URI=mongodb+srv://...');
    console.error('   4. Restart: cd server && npm run dev\n');
    console.log('⚠️  Server running WITHOUT database (demo/localStorage mode)\n');
    return false;
  }
};

module.exports = connectDB;
