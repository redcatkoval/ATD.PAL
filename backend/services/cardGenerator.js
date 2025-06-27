const crypto = require('crypto');
const { PDFDocument, rgb } = require('pdf-lib');
const qrcode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');
const pool = require('../db/pool');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
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
  logger.info('Supabase client initialized in cardGenerator');
} else {
  logger.warn('Supabase environment variables not set or contain default values. Supabase client not initialized in cardGenerator.');
}

/**
 * Get system prompt for AI responses
 * @returns {Promise<string>} System prompt content
 */
async function getSystemPrompt() {
  try {
    const personaPath = path.join(__dirname, '..', 'persona.md');
    const personaContent = await fs.readFile(personaPath, 'utf8');
    return personaContent;
  } catch (error) {
    console.error('Error reading persona file:', error);
    return 'You are ATD.PAL, a helpful assistant.'; // Fallback prompt
  }
}

/**
 * Generate AI response for card interaction
 * @param {string} systemPrompt - System prompt for AI
 * @param {string} context - Context for the AI response
 * @returns {Promise<string>} AI generated response
 */
async function generateAIResponse(systemPrompt, context) {
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Я обнаружил, что такие визитки уже были сгенерированы ранее. Вы хотите получить ссылки на скачивание или внести изменения?';
  }
}

/**
 * Save message to chat history
 * @param {string} userId - User ID
 * @param {string} sender - Message sender ('user' or 'bot')
 * @param {string} content - Message content
 * @returns {Promise<Object>} Saved message record
 */
async function saveMessage(userId, sender, content) {
  try {
    const query = 'INSERT INTO chat_history (user_id, sender, content) VALUES ($1, $2, $3) RETURNING *';
    const values = [userId, sender, content];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

/**
 * Generates a business card or returns cached version if exists
 * @param {Object} data - Card data
 * @param {string} data.name - Person's name
 * @param {string} data.title - Job title
 * @param {string} data.email - Email address
 * @param {string} data.phone - Phone number
 * @param {string} data.userId - User ID
 * @param {string} data.size - Card size ('90x50' or '85x55')
 * @param {string} data.theme - Card theme ('dark' or 'light')
 * @param {string} data.qrCodeUrl - URL for QR code
 * @returns {Promise<Object>} - Object with frontSideUrl and backSideUrl or chat interaction
 */
async function generateAndCacheCard(data) {
  try {
    const { name, title, email, phone, userId, size, theme, qrCodeUrl } = data;
    
    // 1. Create a unique hash from input data (excluding userId)
    const dataToHash = `${name}${title}${email}${phone}${size}${theme}${qrCodeUrl || ''}`;
    const userDataHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    
    // Check if card already exists in cache
    const existingCard = await checkCardCache(userDataHash);
    if (existingCard) {
      console.log('Card found in cache, initiating chat interaction');
      
      // Generate AI response for existing card
      const systemPrompt = await getSystemPrompt();
      const context = `Пользователь ${name} пытается создать визитку, но я обнаружил, что визитка с такими данными уже существует в системе. 
                      Сообщи ему об этом вежливо и спроси, хочет ли он получить ссылки на скачивание существующей визитки или внести изменения. 
                      Если он хочет внести изменения, попроси указать, какие данные нужно изменить (например, "поменяй телефон на +7 999 123-45-67").`;
      
      const aiMessage = await generateAIResponse(systemPrompt, context);
      
      // Save bot message to chat history
      await saveMessage(userId, 'bot', aiMessage);
      
      // Return special response indicating chat interaction is needed
      return {
        status: 'existing_card',
        message: aiMessage,
        cardData: {
          frontSideUrl: existingCard.frontSideUrl,
          backSideUrl: existingCard.backSideUrl,
          userDataHash: userDataHash
        }
      };
    }
    
    // Generate new card if not in cache
    console.log('Generating new card...');
    
    // 2. Generate QR code if URL provided
    let qrCodeBuffer = null;
    if (qrCodeUrl) {
      qrCodeBuffer = await generateQRCode(qrCodeUrl);
    }
    
    // 3. Load templates based on theme and size
    const frontTemplateUrl = `assets/templates/template_${theme}_${size}.pdf`;
    const backTemplateUrl = `assets/templates/template_back_${size}.pdf`;
    
    // Download templates from Supabase Storage
    const frontTemplateBuffer = await downloadFromStorage(frontTemplateUrl);
    const backTemplateBuffer = await downloadFromStorage(backTemplateUrl);
    
    // 4. Load fonts
    const fontUrls = [
      'assets/fonts/AUTODOC-Sans-Regular.ttf',
      'assets/fonts/AUTODOC-Sans-Bold.ttf'
    ];
    const fontBuffers = await Promise.all(fontUrls.map(url => downloadFromStorage(url)));
    
    // 5. Process PDFs
    const { frontPdfBytes, backPdfBytes } = await processPDFs(
      frontTemplateBuffer, 
      backTemplateBuffer, 
      fontBuffers,
      { name, title, email, phone },
      qrCodeBuffer
    );
    
    // 6. Generate filenames
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[1] : '';
    const filePrefix = `${firstName}_${lastName}_AUTODOC`;
    
    const frontFileName = `${filePrefix}_front_${size}.pdf`;
    const backFileName = `${filePrefix}_back_${size}.pdf`;
    
    // 7. Upload generated PDFs to storage
    const frontSideUrl = await uploadToStorage(frontPdfBytes, frontFileName);
    const backSideUrl = await uploadToStorage(backPdfBytes, backFileName);
    
    // 8. Save to database cache
    await saveToCardCache(userId, userDataHash, frontSideUrl, backSideUrl);
    
    return {
      status: 'new_card',
      frontSideUrl,
      backSideUrl
    };
    
  } catch (error) {
    console.error('Error generating card:', error);
    throw new Error(`Failed to generate business card: ${error.message}`);
  }
}

/**
 * Check if card exists in cache
 * @param {string} userDataHash - Hash of user data
 * @returns {Promise<Object|null>} - Card data if found, null otherwise
 */
async function checkCardCache(userDataHash) {
  try {
    if (!supabase) {
      logger.warn('Supabase client not initialized, skipping card cache check');
      return null;
    }
    
    // Query Supabase directly instead of using local database pool
    const { data, error } = await supabase
      .from('generated_cards')
      .select('file_url, back_file_url')
      .eq('user_data_hash', userDataHash)
      .single();
    
    if (error) {
      logger.error('Error checking card cache in Supabase:', error);
      return null;
    }
    
    if (data) {
      return {
        frontSideUrl: data.file_url,
        backSideUrl: data.back_file_url
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Error checking card cache:', error);
    return null;
  }
}

/**
 * Save card to cache
 * @param {string} userId - User ID
 * @param {string} userDataHash - Hash of user data
 * @param {string} frontSideUrl - URL of front side PDF
 * @param {string} backSideUrl - URL of back side PDF
 * @returns {Promise<void>}
 */
async function saveToCardCache(userId, userDataHash, frontSideUrl, backSideUrl) {
  try {
    if (!supabase) {
      logger.warn('Supabase client not initialized, skipping save to card cache');
      return;
    }
    
    // Insert directly to Supabase
    const { data, error } = await supabase
      .from('generated_cards')
      .insert([{
        user_id: userId,
        user_data_hash: userDataHash,
        file_url: frontSideUrl,
        back_file_url: backSideUrl,
        created_at: new Date()
      }]);
      
    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error('Error saving to card cache:', error);
    throw error;
  }
}

/**
 * Generate QR code as buffer
 * @param {string} url - URL to encode in QR code
 * @returns {Promise<Buffer>} - QR code as buffer
 */
async function generateQRCode(url) {
  try {
    return await qrcode.toBuffer(url, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Download file from storage
 * @param {string} path - Path to file in storage
 * @returns {Promise<Buffer>} - File buffer
 */
async function downloadFromStorage(path) {
  try {
    if (!supabase) {
      logger.warn(`Supabase client not initialized, cannot download from storage: ${path}`);
      throw new Error('Supabase client not initialized');
    }
    
    const { data, error } = await supabase
      .storage
      .from('atdpal')
      .download(path);
      
    if (error) {
      throw error;
    }
    
    return Buffer.from(await data.arrayBuffer());
  } catch (error) {
    logger.error(`Error downloading file from storage: ${path}`, error);
    throw error;
  }
}

/**
 * Upload file to storage
 * @param {Buffer} fileBytes - File bytes
 * @param {string} fileName - File name
 * @returns {Promise<string>} - Public URL of uploaded file
 */
async function uploadToStorage(fileBytes, fileName) {
  try {
    if (!supabase) {
      logger.warn(`Supabase client not initialized, cannot upload to storage: ${fileName}`);
      throw new Error('Supabase client not initialized');
    }
    
    const filePath = `generated/${Date.now()}_${fileName}`;
    
    const { error } = await supabase
      .storage
      .from('atdpal')
      .upload(filePath, fileBytes, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
      
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data } = supabase
      .storage
      .from('atdpal')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error) {
    logger.error(`Error uploading file to storage: ${fileName}`, error);
    throw error;
  }
}

/**
 * Process PDFs - add text and QR code to templates
 * @param {Buffer} frontTemplateBuffer - Front template buffer
 * @param {Buffer} backTemplateBuffer - Back template buffer
 * @param {Buffer[]} fontBuffers - Font buffers [regular, bold]
 * @param {Object} textData - Text data to add
 * @param {Buffer|null} qrCodeBuffer - QR code buffer
 * @returns {Promise<Object>} - Object with frontPdfBytes and backPdfBytes
 */
async function processPDFs(frontTemplateBuffer, backTemplateBuffer, fontBuffers, textData, qrCodeBuffer) {
  try {
    // Load front template
    const frontPdfDoc = await PDFDocument.load(frontTemplateBuffer);
    const frontPage = frontPdfDoc.getPages()[0];
    
    // Load back template
    const backPdfDoc = await PDFDocument.load(backTemplateBuffer);
    const backPage = backPdfDoc.getPages()[0];
    
    // Embed fonts in front template
    const regularFont = await frontPdfDoc.embedFont(fontBuffers[0]);
    const boldFont = await frontPdfDoc.embedFont(fontBuffers[1]);
    
    // Add text to front side
    const { name, title, email, phone } = textData;
    
    // Position text based on card size (would need to be adjusted for actual templates)
    // Name (bold)
    frontPage.drawText(name, {
      x: 10,
      y: frontPage.getHeight() - 30,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    
    // Title (regular)
    frontPage.drawText(title, {
      x: 10,
      y: frontPage.getHeight() - 45,
      size: 10,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    // Email (regular)
    frontPage.drawText(email, {
      x: 10,
      y: 25,
      size: 8,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    // Phone (regular)
    frontPage.drawText(phone, {
      x: 10,
      y: 15,
      size: 8,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3)
    });
    
    // Add QR code if available
    if (qrCodeBuffer) {
      // Front side QR code
      const frontQrCodeImage = await frontPdfDoc.embedPng(qrCodeBuffer);
      const frontQrCodeDims = frontQrCodeImage.scale(0.2); // Scale down QR code
      frontPage.drawImage(frontQrCodeImage, {
        x: frontPage.getWidth() - frontQrCodeDims.width - 10,
        y: 10,
        width: frontQrCodeDims.width,
        height: frontQrCodeDims.height
      });
      
      // Back side QR code
      const backQrCodeImage = await backPdfDoc.embedPng(qrCodeBuffer);
      const backQrCodeDims = backQrCodeImage.scale(0.2);
      backPage.drawImage(backQrCodeImage, {
        x: backPage.getWidth() - backQrCodeDims.width - 10,
        y: 10,
        width: backQrCodeDims.width,
        height: backQrCodeDims.height
      });
    }
    
    // Save PDFs
    const frontPdfBytes = await frontPdfDoc.save();
    const backPdfBytes = await backPdfDoc.save();
    
    return {
      frontPdfBytes,
      backPdfBytes
    };
  } catch (error) {
    console.error('Error processing PDFs:', error);
    throw error;
  }
}

/**
 * Update existing card with new data
 * @param {string} userDataHash - Hash of original user data
 * @param {Object} newData - New card data
 * @returns {Promise<Object>} - Updated card URLs
 */
async function updateExistingCard(userDataHash, newData) {
  try {
    // Get existing card data
    const existingCard = await checkCardCache(userDataHash);
    if (!existingCard) {
      throw new Error('Card not found in cache');
    }
    
    // Generate new card with updated data
    const updatedCardResult = await generateAndCacheCard(newData);
    
    // If successful, delete old card entry
    if (updatedCardResult.status === 'new_card') {
      await supabase
        .from('generated_cards')
        .delete()
        .eq('user_data_hash', userDataHash);
    }
    
    return updatedCardResult;
  } catch (error) {
    console.error('Error updating existing card:', error);
    throw error;
  }
}

/**
 * Get card data from hash (reverse lookup)
 * @param {string} userDataHash - Hash of user data
 * @returns {Promise<Object|null>} - Card data if found, empty object otherwise
 */
async function getCardDataFromHash(userDataHash) {
  try {
    if (!supabase) {
      logger.warn('Supabase client not initialized, cannot get card data from hash');
      return {};
    }
    
    // First, get the card record from the database
    const { data: cardRecord, error: cardError } = await supabase
      .from('generated_cards')
      .select('*')
      .eq('user_data_hash', userDataHash)
      .single();
      
    if (cardError || !cardRecord) {
      logger.error('Error retrieving card record by hash', { userDataHash, error: cardError });
      return {};
    }
    
    // Try to extract metadata from the file URLs
    const frontUrl = cardRecord.file_url;
    const fileName = frontUrl.split('/').pop();
    
    // Extract name from filename if possible (format: FirstName_LastName_AUTODOC_front_size.pdf)
    let name = '';
    let size = '90x50'; // Default size
    
    try {
      const nameParts = fileName.split('_');
      if (nameParts.length >= 2) {
        name = `${nameParts[0]} ${nameParts[1]}`;
      }
      
      // Try to extract size
      if (fileName.includes('85x55')) {
        size = '85x55';
      }
    } catch (err) {
      logger.warn('Could not parse filename for metadata', { fileName, error: err });
    }
    
    // Return basic info we could extract
    return {
      userId: cardRecord.user_id,
      name: name,
      size: size,
      createdAt: cardRecord.created_at,
      // We can't reliably extract other fields like email, phone, etc.
      // as they're embedded in the PDF and not stored separately
    };
  } catch (error) {
    logger.error('Error getting card data from hash:', error);
    return {};
  }
}

module.exports = {
  generateAndCacheCard,
  updateExistingCard,
  getCardDataFromHash
}; 