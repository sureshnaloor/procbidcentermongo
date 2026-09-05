import { lookup as dnsLookup, setDefaultResultOrder } from 'node:dns';
import type { LookupAddress, LookupOptions } from 'node:dns';
import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';

function ipv4Lookup(
  hostname: string,
  options: LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
): void {
  dnsLookup(hostname, { ...options, family: 4 }, callback);
}

function isAtlasUri(mongoUri: string): boolean {
  return mongoUri.startsWith('mongodb+srv://') || mongoUri.includes('.mongodb.net');
}

const rawUri = process.env.MONGODB_URI?.trim().replace(/^['"]|['"]$/g, '');
if (!rawUri) throw new Error('Please add MONGODB_URI to .env.local');
const uri: string = rawUri;

const atlas = isAtlasUri(uri);
const serverless = process.env.VERCEL === '1';

// Node 17+ may prefer IPv6. Atlas M0 in ap-south-1 is IPv4-only; Vercel then
// aborts TLS with "tlsv1 alert internal error" (SSL alert 80).
if (atlas) setDefaultResultOrder('ipv4first');

const options: MongoClientOptions = {
  // Local mongod has no TLS. Forcing tls:true breaks localhost with
  // CredentialsSignin because authorize cannot reach the database.
  ...(atlas
    ? {
        tls: true,
        family: 4,
        autoSelectFamily: false,
        lookup: ipv4Lookup,
      }
    : {}),
  maxPoolSize: serverless ? 5 : 10,
  minPoolSize: 0,
  ...(serverless ? { maxIdleTimeMS: 10_000 } : {}),
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 10_000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connectClient(): Promise<MongoClient> {
  const client = new MongoClient(uri, options);
  return client.connect().catch((err) => {
    // Drop the cached rejected promise so the next request can retry
    // after Atlas IP allowlisting or a transient TLS abort.
    global._mongoClientPromise = undefined;
    throw err;
  });
}

function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connectClient();
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getClientPromise();
  // Atlas SRV URIs often omit the DB path; c.db() would then use "test".
  return c.db(process.env.MONGODB_DB || 'procbidcenter');
}

export default getClientPromise();
