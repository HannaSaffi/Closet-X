const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const stream = require('stream');

let bucket;

function initGridFS() {
  if (!bucket) {
    const db = mongoose.connection.db;
    bucket = new GridFSBucket(db, { bucketName: 'images' });
    console.log('✅ GridFS initialized');
  }
  return bucket;
}

exports.uploadImage = async (file, folder = 'wardrobe') => {
  try {
    const gridfs = initGridFS();

    const optimizedBuffer = await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const thumbnailBuffer = await sharp(file.buffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    const fileName = `${folder}/${uuidv4()}-${Date.now()}.jpg`;
    const thumbnailName = `${folder}/thumb-${uuidv4()}-${Date.now()}.jpg`;

    const imageId = await uploadToGridFS(gridfs, fileName, optimizedBuffer, 'image/jpeg');
    const thumbnailId = await uploadToGridFS(gridfs, thumbnailName, thumbnailBuffer, 'image/jpeg');

    return {
      imageUrl: `/api/wardrobe/image/${imageId}`,
      thumbnailUrl: `/api/wardrobe/image/${thumbnailId}`,
      imageId: imageId.toString(),
      thumbnailId: thumbnailId.toString()
    };
  } catch (error) {
    console.error('GridFS upload error:', error);
    throw new Error('Failed to upload image to MongoDB');
  }
};

function uploadToGridFS(bucket, filename, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const readStream = stream.Readable.from(buffer);
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: { uploadedAt: new Date() }
    });

    readStream.pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });
}

exports.downloadImage = async (fileId) => {
  try {
    const gridfs = initGridFS();
    const _id = new mongoose.Types.ObjectId(fileId);

    const files = await gridfs.find({ _id }).toArray();
    if (!files || files.length === 0) {
      throw new Error('File not found');
    }

    const file = files[0];
    const downloadStream = gridfs.openDownloadStream(_id);

    return {
      stream: downloadStream,
      contentType: file.contentType || 'image/jpeg',
      filename: file.filename
    };
  } catch (error) {
    console.error('GridFS download error:', error);
    throw new Error('Failed to download image from MongoDB');
  }
};

exports.deleteImage = async (imageId, thumbnailId) => {
  try {
    const gridfs = initGridFS();

    if (imageId) {
      await gridfs.delete(new mongoose.Types.ObjectId(imageId));
    }

    if (thumbnailId) {
      await gridfs.delete(new mongoose.Types.ObjectId(thumbnailId));
    }

    return true;
  } catch (error) {
    console.error('GridFS delete error:', error);
    throw new Error('Failed to delete image from MongoDB');
  }
};
