const mongoose = require("mongoose");
// services/wardrobe-service/src/controllers/clothingController.js
const ClothingItem = require('../models/ClothingItem');
const { uploadImage, deleteImage, downloadImage } = require('../services/gridfsService');
const { publishMessage } = require('../services/messageQueue');

exports.getAllClothingItems = async (req, res) => {
  try {
    const { category, color, season, isActive, tags, sortBy, order, limit, skip } = req.query;
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const filter = { userId };
    if (category) filter.category = category;
    if (color) filter['color.primary'] = new RegExp(color, 'i');
    if (season) filter.season = season;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (tags) filter.tags = { $in: tags.split(',') };

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1;
    }

    const items = await ClothingItem.find(filter)
      .sort(sortOptions)
      .limit(parseInt(limit) || 100)
      .skip(parseInt(skip) || 0)
      .lean();

    const total = await ClothingItem.countDocuments(filter);

    res.json({ success: true, count: items.length, total, data: items });
  } catch (error) {
    console.error('Error fetching clothing items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch clothing items' });
  }
};

exports.getClothingItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const item = await ClothingItem.findOne({ _id: id, userId });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Clothing item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching clothing item:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch clothing item' });
  }
};

exports.createClothingItem = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { imageUrl, thumbnailUrl, imageId, thumbnailId } = await uploadImage(file, `wardrobe/${userId}`);

    const clothingData = {
      userId,
      imageUrl,
      thumbnailUrl,
      imageId,
      thumbnailId,
      category: req.body.category || 'other',
      subcategory: req.body.subcategory,
      color: {
        primary: req.body.color || req.body.primaryColor,
        secondary: req.body.secondaryColors ? req.body.secondaryColors.split(',') : []
      },
      brand: req.body.brand,
      season: req.body.season ? req.body.season.split(',') : ['all-season'],
      fabric: req.body.fabric,
      tags: req.body.tags ? req.body.tags.split(',') : [],
      size: req.body.size,
      purchaseDate: req.body.purchaseDate,
      price: req.body.price,
      metadata: {
        uploadedFrom: req.headers['user-agent'],
        imageSize: file.size
      }
    };

    const item = await ClothingItem.create(clothingData);

    if (process.env.RABBITMQ_URL) {
      await publishMessage('image.analyze', {
        itemId: item._id.toString(),
        userId: userId.toString(),
        imageUrl,
        imageId,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Clothing item created successfully',
      data: item
    });
  } catch (error) {
    console.error('Error creating clothing item:', error);
    res.status(500).json({ success: false, error: 'Failed to create clothing item' });
  }
};

exports.updateClothingItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const updates = req.body;

    const item = await ClothingItem.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, error: 'Clothing item not found' });
    }

    res.json({ success: true, message: 'Clothing item updated successfully', data: item });
  } catch (error) {
    console.error('Error updating clothing item:', error);
    res.status(500).json({ success: false, error: 'Failed to update clothing item' });
  }
};

exports.deleteClothingItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const item = await ClothingItem.findOne({ _id: id, userId });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Clothing item not found' });
    }

    if (item.imageId) {
      await deleteImage(item.imageId, item.thumbnailId);
    }

    await ClothingItem.deleteOne({ _id: id, userId });

    res.json({ success: true, message: 'Clothing item deleted successfully' });
  } catch (error) {
    console.error('Error deleting clothing item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete clothing item' });
  }
};

exports.markAsWorn = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const item = await ClothingItem.findOneAndUpdate(
      { _id: id, userId },
      { $inc: { wearCount: 1 }, $set: { lastWorn: new Date() } },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, error: 'Clothing item not found' });
    }

    res.json({ success: true, message: 'Wear count updated', data: item });
  } catch (error) {
    console.error('Error marking item as worn:', error);
    res.status(500).json({ success: false, error: 'Failed to update wear count' });
  }
};

exports.getWardrobeStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    console.log('📊 Stats query for userId:', userId);

    const stats = await ClothingItem.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$price' },
          averageWearCount: { $avg: '$wearCount' }
        }
      }
    ]);

    const categoryStats = await ClothingItem.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: '$price' } } }
    ]);

    res.json({ success: true, data: { overall: stats[0] || {}, byCategory: categoryStats } });
  } catch (error) {
    console.error('Error fetching wardrobe stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
};

exports.getImage = async (req, res) => {
  try {
    const { fileId } = req.params;

    const { stream, contentType, filename } = await downloadImage(fileId);

    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `inline; filename="${filename}"`);
    res.set('Cache-Control', 'public, max-age=86400');

    stream.pipe(res);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(404).json({ success: false, error: 'Image not found' });
  }
};
