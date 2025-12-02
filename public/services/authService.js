import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Datastore } from '@google-cloud/datastore';
import { Storage } from '@google-cloud/storage';
import { logAuthEvent, logWarning } from './logger.js';
import logger from './logger.js';

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
    console.log(`[DATASTORE] Starting addImage for ${email}, imageId: ${image.id}`);
    await transaction.run();
    const [entity] = await transaction.get(key);
    const current = (entity && Array.isArray(entity.images)) ? entity.images : [];
    const updated = [image, ...current];
    transaction.save({ key, data: { images: updated } });
    await transaction.commit();
    console.log(`[DATASTORE] Successfully saved image for ${email}`);
    return image;
  } catch (err) {
    console.error(`[DATASTORE ERROR] Failed to save image for ${email}:`, err);
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
      logWarning('Registration attempt for existing user', { email: normalizedEmail });
      throw new Error('User already exists');
    }

    const hashed = await bcrypt.hash(password, 10); // 10 rounds balances security/perf
    await this.store.saveUser(normalizedEmail, { 
      fullName, 
      username, 
      email: normalizedEmail, 
      password: hashed 
    });

    logAuthEvent('REGISTRATION_SUCCESS', normalizedEmail, { username, fullName });
    return this.generateToken({ email });
  }

  async loginUser(email, password) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.store.getUser(normalizedEmail);
    if (!user) {
      logWarning('Login attempt for non-existent user', { email: normalizedEmail });
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logWarning('Login attempt with invalid password', { email: normalizedEmail });
      throw new Error('Invalid credentials');
    }

    logAuthEvent('LOGIN_SUCCESS', normalizedEmail, { username: user.username });
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

    try {
      await file.save(buffer, {
        metadata: {
          contentType: 'image/png',
          metadata: {
            userEmail: email,
            uploadedAt: imageData.timestamp
          }
        }
      });

      logger.info('Image uploaded to Cloud Storage', {
        user: email,
        imageId,
        storagePath: fileName
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

      // Save metadata to Datastore
      const result = await this.store.addImage(email, entry);
      
      logger.info('Image metadata saved to Datastore', {
        user: email,
        imageId
      });

      return result;

    } catch (error) {
      logger.error('Failed to save image', {
        user: email,
        imageId,
        storagePath: fileName,
        error: error.message,
        stack: error.stack
      });
      
      // If Datastore save failed but bucket upload succeeded, try to clean up
      if (error.message && error.message.includes('Datastore')) {
        logger.warn('Attempting to delete orphaned file from bucket', {
          user: email,
          imageId,
          storagePath: fileName
        });
        try {
          await file.delete();
          logger.info('Orphaned file deleted from bucket', { storagePath: fileName });
        } catch (deleteErr) {
          logger.error('Failed to delete orphaned file', {
            storagePath: fileName,
            error: deleteErr.message
          });
        }
      }
      
      throw error;
    }
  }

  async getImagesForUser(email) {
    // Load metadata from Datastore
    const images = await this.store.getImages(email);
    
    logger.info('Loading images from Datastore', {
      user: email,
      totalInDatastore: images.length,
      bucket: this.bucket?.name || 'not configured'
    });

    if (!this.bucket) return images;

    // Generate signed URLs for all images in parallel without checking existence first
    // This significantly reduces API calls from 2 per image to 1 per image
    const signedImages = await Promise.all(images.map(async (img) => {
      try {
        const file = this.bucket.file(img.storagePath);
        
        // Generate a signed URL that expires in 1 hour
        // Skip the exists() check - if file doesn't exist, the URL will return 404 when accessed
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
        });
        
        // Return the image with the signed URL instead of public URL
        return {
          ...img,
          url: signedUrl
        };
      } catch (e) {
        // Log error but return the image with the public URL as fallback
        logger.error('Error generating signed URL for image', {
          user: email,
          imageId: img.id,
          storagePath: img.storagePath,
          error: e.message,
          errorCode: e.code
        });
        // Return with original public URL as fallback
        return img;
      }
    }));

    logger.info('Images loaded from Google Cloud Storage', {
      user: email,
      totalInDatastore: images.length,
      signedUrlsGenerated: signedImages.length
    });

    return signedImages;
  }
}

/**
 * Express middleware factory that verifies Bearer tokens and attaches the user payload.
 */
export const authenticateToken = (jwtSecret) => (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logWarning('Authentication failed: Token missing', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload; // attach for downstream handlers
    next();
  } catch (err) {
    logWarning('Authentication failed: Invalid token', {
      path: req.path,
      method: req.method,
      error: err.message,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Create the default store for your app. Use this when you want Datastore mode.
 */
export const createDefaultStore = () => new DatastoreStore();
