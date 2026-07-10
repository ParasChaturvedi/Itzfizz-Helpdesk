const mongoose = require('mongoose');

/**
 * Serverless-safe Mongoose connection.
 * On platforms like Vercel each request may run in a fresh lambda, so we cache
 * the connection on the global object to avoid opening a new pool every time.
 */
let cached = global.__deskflowMongoose;
if (!cached) {
  cached = global.__deskflowMongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(uri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
