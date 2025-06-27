const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const cardGenerator = require('../services/cardGenerator');
const logger = require('../services/logger');

// Initialize Supabase client (only if environment variables are set)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY &&
    process.env.SUPABASE_URL !== 'your_supabase_url_here' &&
    process.env.SUPABASE_SERVICE_KEY !== 'your_supabase_service_key_here') {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  logger.info('Supabase client initialized in cards router');
} else {
  logger.warn('Supabase environment variables not set or contain default values. Supabase client not initialized in cards router.');
}

// Validate card data
function validateCardData(data) {
  const { name, title, email, phone, userId, size, theme } = data;
  
  if (!name || !title || !email || !userId) {
    return { valid: false, message: 'Required fields missing: name, title, email, and userId are required' };
  }
  
  if (size && !['90x50', '85x55'].includes(size)) {
    return { valid: false, message: 'Size must be either "90x50" or "85x55"' };
  }
  
  if (theme && !['dark', 'light'].includes(theme)) {
    return { valid: false, message: 'Theme must be either "dark" or "light"' };
  }
  
  return { valid: true };
}

// GET /api/cards - Get all cards for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }
    
    // Check if Supabase client is initialized
    if (!supabase) {
      return res.status(503).json({ error: 'Сервис временно недоступен', message: 'Supabase client not initialized' });
    }
    
    logger.info(`Fetching cards for user ${userId}`);
    
    // Query the database for cards belonging to this user
    const { data, error } = await supabase
      .from('generated_cards')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      logger.error('Error fetching cards from database', { userId, error });
      return res.status(500).json({ 
        error: 'Failed to fetch cards', 
        message: process.env.NODE_ENV === 'development' ? error.message : 'Database error' 
      });
    }
    
    // If no cards found, return empty array
    if (!data || data.length === 0) {
      return res.json({ cards: [] });
    }
    
    // Process the cards data to return in a friendly format
    const cards = await Promise.all(data.map(async (card) => {
      // Get the card data from the hash if possible
      let cardData = {};
      try {
        cardData = await cardGenerator.getCardDataFromHash(card.user_data_hash);
      } catch (err) {
        logger.warn(`Could not decode card data for hash ${card.user_data_hash}`, { error: err });
      }
      
      return {
        id: card.id,
        userId: card.user_id,
        frontSideUrl: card.file_url,
        backSideUrl: card.back_file_url,
        createdAt: card.created_at,
        cardData: cardData
      };
    }));
    
    return res.json({ cards });
    
  } catch (error) {
    logger.error('Error retrieving cards:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve cards', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// POST /api/cards/generate
router.post('/generate', async (req, res) => {
  try {
    const cardData = req.body;
    
    // Set defaults if not provided
    cardData.size = cardData.size || '90x50';
    cardData.theme = cardData.theme || 'dark';
    
    // Validate input data
    const validation = validateCardData(cardData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    // Generate or retrieve card
    const result = await cardGenerator.generateAndCacheCard(cardData);
    
    // Handle different response types based on status
    if (result.status === 'existing_card') {
      // Return chat interaction for existing card
      return res.json({
        success: true,
        status: 'existing_card',
        message: result.message,
        cardData: result.cardData
      });
    } else {
      // Return new card URLs
      return res.json({
        success: true,
        status: 'new_card',
        frontSideUrl: result.frontSideUrl,
        backSideUrl: result.backSideUrl
      });
    }
    
  } catch (error) {
    console.error('Error generating card:', error);
    res.status(500).json({ 
      error: 'Failed to generate card', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// POST /api/cards/update
router.post('/update', async (req, res) => {
  try {
    const { userDataHash, updatedData } = req.body;
    
    if (!userDataHash || !updatedData || !updatedData.userId) {
      return res.status(400).json({ error: 'userDataHash, updatedData, and userId are required' });
    }
    
    // Validate updated data
    const validation = validateCardData(updatedData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    // Update existing card
    const result = await cardGenerator.updateExistingCard(userDataHash, updatedData);
    
    return res.json({
      success: true,
      status: result.status,
      frontSideUrl: result.frontSideUrl,
      backSideUrl: result.backSideUrl
    });
    
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ 
      error: 'Failed to update card', 
      message: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

module.exports = router; 