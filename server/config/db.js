const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
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
