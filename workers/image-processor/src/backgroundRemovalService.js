// workers/image-processor/src/backgroundRemovalService.js
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY;
const REMOVEBG_API_URL = 'https://api.remove.bg/v1.0/removebg';

/**
 * Remove background from an image using remove.bg API
 */
async function removeBackground(imageBuffer) {
  if (!REMOVEBG_API_KEY) {
    console.warn('⚠️  REMOVEBG_API_KEY not set. Skipping background removal.');
    return null;
  }

  try {
    console.log('🔄 Removing background with remove.bg API...');
    
    const formData = new FormData();
    formData.append('image_file_b64', imageBuffer.toString('base64'));
    formData.append('size', 'auto');
    formData.append('format', 'png');
    formData.append('type', 'auto');

    const response = await axios.post(REMOVEBG_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': REMOVEBG_API_KEY
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });

    console.log('✅ Background removed successfully');
    console.log('📊 API credits used:', response.headers['x-credits-charged'] || 'unknown');
    console.log('📊 Credits remaining:', response.headers['x-ratelimit-remaining'] || 'unknown');
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error('❌ Failed to remove background:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Download image from GridFS
 */
async function downloadImageFromGridFS(imageId) {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    return new Promise((resolve, reject) => {
      const chunks = [];
      const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(imageId));
      
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
      downloadStream.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Failed to download image from GridFS:', error);
    throw error;
  }
}

/**
 * Upload processed image back to GridFS
 */
async function uploadImageToGridFS(imageBuffer, filename, userId) {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    const uploadStream = bucket.openUploadStream(`${userId}/no-bg-${filename}`, {
      contentType: 'image/png',
      metadata: {
        userId,
        processedAt: new Date(),
        processing: 'background_removed'
      }
    });

    return new Promise((resolve, reject) => {
      uploadStream.on('finish', () => {
        console.log('✅ Uploaded processed image to GridFS:', uploadStream.id);
        resolve(uploadStream.id.toString());
      });
      uploadStream.on('error', reject);
      uploadStream.write(imageBuffer);
      uploadStream.end();
    });
  } catch (error) {
    console.error('❌ Failed to upload image to GridFS:', error);
    throw error;
  }
}

/**
 * Process image: download, remove background, upload result
 */
async function processImageBackgroundRemoval(imageId, userId, filename = 'clothing-item.jpg') {
  try {
    console.log(`🔄 Starting background removal for image ${imageId}`);
    
    const imageBuffer = await downloadImageFromGridFS(imageId);
    console.log(`📥 Downloaded image from GridFS (${imageBuffer.length} bytes)`);
    
    const processedBuffer = await removeBackground(imageBuffer);
    
    if (!processedBuffer) {
      console.warn('⚠️  Background removal skipped or failed');
      return { success: false, processedImageId: null };
    }
    
    const processedImageId = await uploadImageToGridFS(processedBuffer, filename, userId);
    
    console.log('✅ Background removal complete');
    return { 
      success: true, 
      processedImageId,
      originalSize: imageBuffer.length,
      processedSize: processedBuffer.length
    };
  } catch (error) {
    console.error('❌ Background removal process failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  removeBackground,
  downloadImageFromGridFS,
  uploadImageToGridFS,
  processImageBackgroundRemoval
};
