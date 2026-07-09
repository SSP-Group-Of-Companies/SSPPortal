import mongoose from "mongoose";
import { MONGO_URI } from "@/app/config/env";

/**
 * Serverless-safe mongoose connection.
 *
 * The connection promise is cached on `globalThis` so hot reloads in dev and
 * concurrent invocations on Vercel reuse one connection pool instead of
 * exhausting Atlas connection limits.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  __sspportalMongoose?: MongooseCache;
};

const cache: MongooseCache = globalWithMongoose.__sspportalMongoose ?? {
  conn: null,
  promise: null,
};
globalWithMongoose.__sspportalMongoose = cache;

export default async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(MONGO_URI, { bufferCommands: false })
      .catch((err) => {
        // Reset so the next request can retry instead of reusing a rejected promise.
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
