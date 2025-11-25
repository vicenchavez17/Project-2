import { storage } from '@google-cloud/storage';
import crypto from 'crypto';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

export const uploadImageBuffer = async ({ buffer, contentType, originalName, userId }) => {
    const fileName = `${userId}/${crypto.randomUUID()}-${originalName}`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
        metadata: { contentType, metadata: {userId} 
        }, resumable: false,
        predefinedAct: 'private'
    });

    return {
        fileName,
        gcsUri: `gs://${bucketName}/${fileName}`
    };
};