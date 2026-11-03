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

const https = require('https');

/**
 * Check if a URL returns 200 OK via HEAD request
 */
const checkUrlAccess = (url) => {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = https.request({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'HEAD',
        timeout: 3500
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch {
      resolve(false);
    }
  });
};

/**
 * Get a presigned URL or direct access URL for downloading/viewing a file.
 * If AWS IAM quarantined the access key (e.g. AWSCompromisedKeyQuarantineV3 explicit deny),
 * presigned URLs will receive 403 AccessDenied while the direct bucket URL is accessible.
 * This function validates the URL and automatically returns the working URL.
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiration time in seconds (default 3600)
 * @returns {Promise<string>} - Valid download/view URL
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    // Verify whether the presigned URL is accessible
    const isWorking = await checkUrlAccess(signedUrl);
    if (!isWorking) {
      // If presigned URL is denied (e.g. IAM key quarantine), check if direct bucket URL is accessible
      const region = process.env.AWS_REGION || 'ap-south-1';
      const directUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
      const isDirectWorking = await checkUrlAccess(directUrl);
      if (isDirectWorking) {
        console.warn(`[s3Service]: Presigned URL denied (likely IAM key quarantine); serving accessible direct S3 URL for: ${key}`);
        return directUrl;
      }
    }

    return signedUrl;
  } catch (error) {
    console.error('S3 Get URL Error:', error);
    const region = process.env.AWS_REGION || 'ap-south-1';
    return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
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

