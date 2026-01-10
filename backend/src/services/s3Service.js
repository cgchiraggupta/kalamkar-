/**
 * AWS S3 Service
 * 
 * Production file storage with S3 integration
 */

import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

// Configure AWS SDK
const s3 = new AWS.S3({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region,
});

/**
 * Check if S3 is configured and available
 */
export function isS3Available() {
    return !!(config.aws.accessKeyId && config.aws.secretAccessKey && config.aws.s3Bucket);
}

/**
 * Upload file to S3
 * @param {string} filePath - Local file path
 * @param {string} key - S3 object key
 * @param {string} contentType - File content type
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
export async function uploadToS3(filePath, key, contentType) {
    if (!isS3Available()) {
        throw new ApiError(500, 'S3 not configured');
    }

    try {
        const fileStream = fs.createReadStream(filePath);
        const stats = fs.statSync(filePath);

        const uploadParams = {
            Bucket: config.aws.s3Bucket,
            Key: key,
            Body: fileStream,
            ContentType: contentType,
            ContentLength: stats.size,
            ServerSideEncryption: 'AES256',
            Metadata: {
                'uploaded-at': new Date().toISOString(),
                'original-name': path.basename(filePath),
            }
        };

        logger.info('Uploading file to S3', { 
            key, 
            size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
            contentType 
        });

        const result = await s3.upload(uploadParams).promise();

        logger.info('File uploaded to S3 successfully', { 
            key, 
            location: result.Location,
            etag: result.ETag 
        });

        return {
            url: result.Location,
            key: result.Key,
            etag: result.ETag,
            bucket: result.Bucket,
            size: stats.size,
            contentType,
        };

    } catch (error) {
        logger.error('S3 upload failed', { 
            error: error.message, 
            key,
            filePath 
        });
        throw new ApiError(500, `S3 upload failed: ${error.message}`);
    }
}

/**
 * Download file from S3
 * @param {string} key - S3 object key
 * @param {string} localPath - Local destination path
 * @returns {Promise<void>}
 */
export async function downloadFromS3(key, localPath) {
    if (!isS3Available()) {
        throw new ApiError(500, 'S3 not configured');
    }

    try {
        const params = {
            Bucket: config.aws.s3Bucket,
            Key: key,
        };

        logger.info('Downloading file from S3', { key, localPath });

        const s3Stream = s3.getObject(params).createReadStream();
        const writeStream = fs.createWriteStream(localPath);

        return new Promise((resolve, reject) => {
            s3Stream.pipe(writeStream);
            
            writeStream.on('finish', () => {
                logger.info('File downloaded from S3 successfully', { key, localPath });
                resolve();
            });

            writeStream.on('error', (error) => {
                logger.error('S3 download failed', { error: error.message, key });
                reject(new ApiError(500, `S3 download failed: ${error.message}`));
            });
        });

    } catch (error) {
        logger.error('S3 download error', { error: error.message, key });
        throw new ApiError(500, `S3 download failed: ${error.message}`);
    }
}

/**
 * Delete file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
export async function deleteFromS3(key) {
    if (!isS3Available()) {
        throw new ApiError(500, 'S3 not configured');
    }

    try {
        const params = {
            Bucket: config.aws.s3Bucket,
            Key: key,
        };

        logger.info('Deleting file from S3', { key });

        await s3.deleteObject(params).promise();

        logger.info('File deleted from S3 successfully', { key });

    } catch (error) {
        logger.error('S3 delete failed', { error: error.message, key });
        throw new ApiError(500, `S3 delete failed: ${error.message}`);
    }
}

/**
 * Generate presigned URL for direct upload
 * @param {string} key - S3 object key
 * @param {string} contentType - File content type
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
export async function generatePresignedUploadUrl(key, contentType, expiresIn = 3600) {
    if (!isS3Available()) {
        throw new ApiError(500, 'S3 not configured');
    }

    try {
        const params = {
            Bucket: config.aws.s3Bucket,
            Key: key,
            ContentType: contentType,
            Expires: expiresIn,
            ServerSideEncryption: 'AES256',
        };

        const url = await s3.getSignedUrlPromise('putObject', params);

        logger.info('Generated presigned upload URL', { key, expiresIn });

        return url;

    } catch (error) {
        logger.error('Failed to generate presigned URL', { error: error.message, key });
        throw new ApiError(500, `Failed to generate presigned URL: ${error.message}`);
    }
}

/**
 * Generate presigned URL for download
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
export async function generatePresignedDownloadUrl(key, expiresIn = 3600) {
    if (!isS3Available()) {
        throw new ApiError(500, 'S3 not configured');
    }

    try {
        const params = {
            Bucket: config.aws.s3Bucket,
            Key: key,
            Expires: expiresIn,
        };

        const url = await s3.getSignedUrlPromise('getObject', params);

        logger.info('Generated presigned download URL', { key, expiresIn });

        return url;

    } catch (error) {
        logger.error('Failed to generate presigned download URL', { error: error.message, key });
        throw new ApiError(500, `Failed to generate presigned download URL: ${error.message}`);
    }
}

/**
 * List objects in S3 bucket with prefix
 * @param {string} prefix - Object key prefix
 * @param {number} maxKeys - Maximum number of keys to return
 * @returns {Promise<Array>} List of objects
 */
export async function listS3Objects(prefix = '', maxKeys = 1000) {
    if (!isS3Available()) {
        throw new ApiError(500, 'S3 not configured');
    }

    try {
        const params = {
            Bucket: config.aws.s3Bucket,
            Prefix: prefix,
            MaxKeys: maxKeys,
        };

        const result = await s3.listObjectsV2(params).promise();

        return result.Contents.map(obj => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            etag: obj.ETag,
        }));

    } catch (error) {
        logger.error('Failed to list S3 objects', { error: error.message, prefix });
        throw new ApiError(500, `Failed to list S3 objects: ${error.message}`);
    }
}

/**
 * Get object metadata from S3
 * @param {string} key - S3 object key
 * @returns {Promise<Object>} Object metadata
 */
export async function getS3ObjectMetadata(key) {
    if (!isS3Available()) {
        throw new ApiError(500, 'S3 not configured');
    }

    try {
        const params = {
            Bucket: config.aws.s3Bucket,
            Key: key,
        };

        const result = await s3.headObject(params).promise();

        return {
            contentLength: result.ContentLength,
            contentType: result.ContentType,
            lastModified: result.LastModified,
            etag: result.ETag,
            metadata: result.Metadata,
        };

    } catch (error) {
        if (error.code === 'NotFound') {
            return null;
        }
        logger.error('Failed to get S3 object metadata', { error: error.message, key });
        throw new ApiError(500, `Failed to get S3 object metadata: ${error.message}`);
    }
}

/**
 * Copy object within S3
 * @param {string} sourceKey - Source object key
 * @param {string} destinationKey - Destination object key
 * @returns {Promise<Object>} Copy result
 */
export async function copyS3Object(sourceKey, destinationKey) {
    if (!isS3Available()) {
        throw new ApiError(500, 'S3 not configured');
    }

    try {
        const params = {
            Bucket: config.aws.s3Bucket,
            CopySource: `${config.aws.s3Bucket}/${sourceKey}`,
            Key: destinationKey,
            ServerSideEncryption: 'AES256',
        };

        const result = await s3.copyObject(params).promise();

        logger.info('S3 object copied successfully', { 
            sourceKey, 
            destinationKey,
            etag: result.CopyObjectResult.ETag 
        });

        return {
            etag: result.CopyObjectResult.ETag,
            lastModified: result.CopyObjectResult.LastModified,
        };

    } catch (error) {
        logger.error('Failed to copy S3 object', { 
            error: error.message, 
            sourceKey, 
            destinationKey 
        });
        throw new ApiError(500, `Failed to copy S3 object: ${error.message}`);
    }
}

/**
 * Generate S3 key for file
 * @param {string} userId - User ID
 * @param {string} type - File type (videos, exports, thumbnails)
 * @param {string} filename - Original filename
 * @returns {string} S3 key
 */
export function generateS3Key(userId, type, filename) {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const uuid = uuidv4();
    const extension = path.extname(filename);
    
    return `${type}/${userId}/${timestamp}/${uuid}${extension}`;
}

/**
 * Health check for S3 connection
 * @returns {Promise<Object>} Health status
 */
export async function s3HealthCheck() {
    if (!isS3Available()) {
        return {
            status: 'unavailable',
            message: 'S3 not configured'
        };
    }

    try {
        const start = Date.now();
        
        // Try to list bucket (minimal operation)
        await s3.listObjectsV2({
            Bucket: config.aws.s3Bucket,
            MaxKeys: 1
        }).promise();

        const duration = Date.now() - start;

        return {
            status: 'healthy',
            responseTime: `${duration}ms`,
            bucket: config.aws.s3Bucket,
            region: config.aws.region
        };

    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            bucket: config.aws.s3Bucket
        };
    }
}

export default {
    isS3Available,
    uploadToS3,
    downloadFromS3,
    deleteFromS3,
    generatePresignedUploadUrl,
    generatePresignedDownloadUrl,
    listS3Objects,
    getS3ObjectMetadata,
    copyS3Object,
    generateS3Key,
    s3HealthCheck
};