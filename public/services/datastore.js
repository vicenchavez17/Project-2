import { Datastore } from '@google-cloud/datastore';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Reuse a single Datastore client so connections stay warm between calls.
const datastore = new Datastore();

// Centralized kind and token configuration makes it easier to tweak later.
const USER_KIND = 'User';
const JWT_SECRET = process.env.JWT_SECRET || 'please-set-a-real-secret';
const TOKEN_TTL = '1h';

// Small helper to normalize Datastore entities into plain JS objects with an id field.
const mapUserEntity = (entity) => ({ id: entity[datastore.KEY].id, ...entity });

export const getUserByEmail = async (email) => {
  // Limit queries to a single result to keep read costs predictable.
  const query = datastore.createQuery(USER_KIND).filter('email', '=', email).limit(1);
  const [results] = await datastore.runQuery(query);

  if (!results || results.length === 0) return null;

  return mapUserEntity(results[0]);
};

const issueToken = (payload) =>
  // Short-lived tokens reduce blast radius if a token is ever leaked.
  jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });

export const registerUser = async ({ email, password }) => {
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    // Prevent duplicate registrations; surface a friendly error to the caller.
    throw new Error('User already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10); // Hash with salt rounds for safety.

  const key = datastore.key([USER_KIND]); // Incomplete key so Datastore assigns an id.
  const entity = {
    key,
    data: {
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    },
  };

  await datastore.save(entity);

  return { id: key.id, email, token: issueToken({ id: key.id, email }) };
};

export const loginUser = async ({ email, password }) => {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  return { id: user.id, email: user.email, token: issueToken({ id: user.id, email: user.email }) };
};