const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy-access-key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy-secret-key',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'compliance-calculator-bucket';

/**
 * Upload a file to S3
 * @param {string} key - S3 object key (path/to/file)
 * @param {Buffer|Uint8Array|string} fileBuffer - File data
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} - S3 Key
 */
const uploadToS3 = async (key, fileBuffer, mimeType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });
    
    await s3Client.send(command);
    return key;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * Get a presigned URL for downloading/viewing a file
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiration time in seconds (default 3600)
 * @returns {Promise<string>} - Presigned URL
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('S3 Get URL Error:', error);
    throw new Error('Failed to generate presigned URL');
  }
};

/**
 * Delete a single object from S3
 * @param {string} key - S3 object key
 */
const deleteFromS3 = async (key) => {
  if (!key) return;
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error) {
    console.warn(`S3 Delete warning for key ${key}:`, error.message);
  }
};

/**
 * Delete all S3 objects under a prefix (e.g. audits/AUDIT_ID/)
 * @param {string} prefix - S3 key prefix
 */
const deleteObjectsByPrefix = async (prefix) => {
  if (!prefix) return;
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });
    const listResult = await s3Client.send(listCommand);

    if (listResult.Contents && listResult.Contents.length > 0) {
      const objectsToDelete = listResult.Contents.map(item => ({ Key: item.Key }));
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: objectsToDelete },
      });
      await s3Client.send(deleteCommand);
    }
  } catch (error) {
    console.warn(`S3 Delete Prefix warning for prefix ${prefix}:`, error.message);
  }
};

module.exports = {
  uploadToS3,
  getPresignedUrl,
  deleteFromS3,
  deleteObjectsByPrefix,
};

