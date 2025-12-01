import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Datastore } from '@google-cloud/datastore';
import { Storage } from '@google-cloud/storage';

/**
 * Datastore-backed store so user auth data and generated images live in
 * managed storage rather than local JSON files. This uses Datastore "kinds"
 * and keys (datastore semantics) instead of Firestore documents/collections.
 */
export class DatastoreStore {
  /**
   * @param {object} opts
   * @param {Datastore} opts.datastoreClient - optional injected client for tests
   * @param {string} opts.userKind - Datastore kind name for users (default: 'User')
   * @param {string} opts.imageKind - Datastore kind name for images (default: 'UserImages')
   */
  constructor({ datastoreClient, userKind = 'User', imageKind = 'UserImages' } = {}) {
    this.datastore = datastoreClient || new Datastore(); // allow injection for tests
    this.userKind = userKind;
    this.imageKind = imageKind;
  }

  _userKey(email) {
    // Use email as the entity key name (string key)
    return this.datastore.key([this.userKind, String(email)]);
  }

  _imageKey(email) {
    return this.datastore.key([this.imageKind, String(email)]);
  }

  async getUser(email) {
    const key = this._userKey(email);
    const [entity] = await this.datastore.get(key);
    // Datastore returns undefined if not found
    return entity || null;
  }

  async saveUser(email, data) {
    const key = this._userKey(email);
    // Datastore save expects { key, data }
    await this.datastore.save({ key, data });
  }

  /**
   * Add an image entry to the user's images array using a transaction to avoid races.
   * image should be a plain JS object (e.g. { id, timestamp, base64 })
   */
  async addImage(email, image) {
    const key = this._imageKey(email);
    const transaction = this.datastore.transaction();
    try {
      await transaction.run();
      const [entity] = await transaction.get(key);
      const current = (entity && Array.isArray(entity.images)) ? entity.images : [];
      const updated = [image, ...current]; // newest first
      transaction.save({ key, data: { images: updated } });
      await transaction.commit();
      return image;
    } catch (err) {
      // ensure transaction is rolled back on error
      try { await transaction.rollback(); } catch (e) { /* ignore */ }
      throw err;
    }
  }

  async getImages(email) {
    const key = this._imageKey(email);
    const [entity] = await this.datastore.get(key);
    if (!entity) return [];
    return entity.images || [];
  }

  /**
   * Overwrite the images array for a user. Used to remove entries
   * that point to non-existent storage objects.
   */
  async setImages(email, images) {
    const key = this._imageKey(email);
    await this.datastore.save({ key, data: { images } });
    return images;
  }
}

/**
 * Handles registration and login using bcrypt + JWT so you can expand to real DB later.
 * Kept unchanged except the store type can now be DatastoreStore.
 */
export class AuthService {
  constructor({ store, jwtSecret }) {
    this.store = store;
    this.jwtSecret = jwtSecret;
  }

  async registerUser(fullName, username, email, password) {
    const normalizedEmail = email.toLowerCase();
    const existing = await this.store.getUser(normalizedEmail);
    if (existing) {
      throw new Error('User already exists');
    }

    const hashed = await bcrypt.hash(password, 10); // 10 rounds balances security/perf
    await this.store.saveUser(normalizedEmail, { 
      fullName, 
      username, 
      email: normalizedEmail, 
      password: hashed 
    });

    return this.generateToken({ email });
  }

  async loginUser(email, password) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.store.getUser(normalizedEmail);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return {
      token: this.generateToken({ email: normalizedEmail }),
      username: user.username
    };
  }

  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '2h' });
  }
}

/**
 * Stores generated images per user in Google Cloud Storage with metadata in Datastore.
 */
export class ImageService {
  constructor({ store, storageBucket }) {
    this.store = store;
    this.storage = new Storage();
    this.bucket = storageBucket ? this.storage.bucket(storageBucket) : null;
  }

  async addImageForUser(email, imageData) {
    if (!this.bucket) {
      throw new Error('Storage bucket not configured');
    }

    const imageId = imageData.id;
    const base64Data = imageData.base64;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Google Cloud Storage with email-based path
    const fileName = `images/${email}/${imageId}.png`;
    const file = this.bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          userEmail: email,
          uploadedAt: imageData.timestamp
        }
      }
    });

    // With Uniform bucket-level access enabled, per-object ACLs are disabled
    // and `file.makePublic()` will fail. We rely on bucket-level IAM bindings
    // (e.g. allUsers:roles/storage.objectViewer) to make objects publicly
    // readable. Construct the public HTTPS URL for access.
    const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
    const entry = {
      id: imageId,
      timestamp: imageData.timestamp,
      storagePath: fileName,
      url: publicUrl
    };

    return this.store.addImage(email, entry);
  }

  async getImagesForUser(email) {
    // Load metadata from Datastore
    const images = await this.store.getImages(email);

    if (!this.bucket) return images;

    const existing = [];
    const missing = [];

    // Check each image exists in the bucket; filter out missing objects
    await Promise.all(images.map(async (img) => {
      try {
        const file = this.bucket.file(img.storagePath);
        const [exists] = await file.exists();
        if (exists) {
          existing.push(img);
        } else {
          missing.push(img);
        }
      } catch (e) {
        // on error, treat as missing to be safe
        missing.push(img);
      }
    }));

    // If there are missing entries, persist the cleaned list back to Datastore
    if (missing.length > 0) {
      try {
        // store may be DatastoreStore which provides setImages
        if (typeof this.store.setImages === 'function') {
          await this.store.setImages(email, existing);
        }
      } catch (e) {
        console.error('Failed to update stored images after pruning missing objects', e);
      }
    }

    return existing;
  }
}

/**
 * Express middleware factory that verifies Bearer tokens and attaches the user payload.
 */
export const authenticateToken = (jwtSecret) => (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload; // attach for downstream handlers
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Create the default store for your app. Use this when you want Datastore mode.
 */
export const createDefaultStore = () => new DatastoreStore();
