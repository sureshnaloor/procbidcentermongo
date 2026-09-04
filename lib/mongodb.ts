import { setDefaultResultOrder } from 'node:dns';
import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';

// Node 18+ Happy Eyeballs prefers IPv6. Atlas shared clusters often abort that
// handshake with "tlsv1 alert internal error" (SSL alert 80) on Vercel.
setDefaultResultOrder('ipv4first');

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Please add MONGODB_URI to .env.local');

const options: MongoClientOptions = {
  tls: true,
  autoSelectFamily: false,
  // Vercel serverless: small pool, drop idle sockets quickly so we do not
  // leak connections across isolates.
  maxPoolSize: 5,
  minPoolSize: 0,
  maxIdleTimeMS: 10_000,
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 10_000,
};

let client: MongoClient;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const c = await clientPromise;
  // Atlas SRV URIs often omit the DB path; c.db() would then use "test".
  return c.db(process.env.MONGODB_DB || 'procbidcenter');
}

export default clientPromise;
