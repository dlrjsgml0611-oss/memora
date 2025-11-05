import mongoose from 'mongoose';

// In production, MONGODB_URI must be set
if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: MONGODB_URI environment variable must be set in production');
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/memora';

if (!process.env.MONGODB_URI && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  MONGODB_URI not set. Using fallback (localhost - development only).');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
