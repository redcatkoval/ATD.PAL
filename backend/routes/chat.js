const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const pool = require('../db/pool');
const { createClient } = require('@supabase/supabase-js');
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
  logger.info('Supabase client initialized');
} else {
  logger.warn('Supabase environment variables not set or contain default values. Supabase client not initialized.');
}

// Trigger words router
const triggerRouter = {
  'визитка': 'start_card_flow',
  'ресурс': 'start_resource_flow',
  'книга': 'start_book_flow',
  'цель': 'start_goal_flow',
  'инструкция': 'start_guide_flow',
  'лицензия': 'start_license_flow'
};

// Read persona file for system prompt
async function getSystemPrompt() {
  try {
    const personaPath = path.join(__dirname, '..', 'persona.md');
    const personaContent = await fs.readFile(personaPath, 'utf8');
    logger.debug('Persona file loaded successfully', { path: personaPath });
    return personaContent;
  } catch (error) {
    logger.error('Failed to read persona file', error, { path: personaPath });
    return 'You are ATD.PAL, a helpful assistant.'; // Fallback prompt
  }
}

// Save message to chat history
async function saveMessage(userId, sender, content) {
  try {
    const query = 'INSERT INTO chat_history (user_id, sender, content) VALUES ($1, $2, $3) RETURNING *';
    const values = [userId, sender, content];
    const result = await pool.query(query, values);
    
    logger.database('INSERT', 'chat_history', { 
      userId, 
      sender, 
      messageLength: content.length,
      messageId: result.rows[0].id 
    });
    
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to save message to database', error, { userId, sender });
    throw error;
  }
}

// Get user's dialog state
async function getDialogState(userId) {
  try {
    const query = `
      SELECT * FROM dialog_state 
      WHERE user_id = $1 
      AND updated_at > NOW() - INTERVAL '30 minutes'
    `;
    const result = await pool.query(query, [userId]);
    
    // Если состояние найдено, но оно устарело, удаляем его
    if (result.rows.length === 0) {
      // Проверяем, есть ли устаревшее состояние, которое нужно удалить
      const checkOldState = await pool.query(
        'SELECT id FROM dialog_state WHERE user_id = $1', 
        [userId]
      );
      
      if (checkOldState.rows.length > 0) {
        logger.warn('Dialog state expired, clearing', { userId });
        await clearDialogState(userId);
      }
      
      logger.database('SELECT', 'dialog_state', { 
        userId, 
        stateFound: false,
        reason: 'No state or expired'
      });
      
      return null;
    }
    
    logger.database('SELECT', 'dialog_state', { 
      userId, 
      stateFound: true,
      status: result.rows[0].status
    });
    
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get dialog state', error, { userId });
    throw error;
  }
}

// Set user's dialog state
async function setDialogState(userId, status, context = {}) {
  try {
    // Use upsert (insert or update)
    const query = `
      INSERT INTO dialog_state (user_id, status, context, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET status = $2, context = $3, updated_at = NOW()
      RETURNING *
    `;
    const values = [userId, status, context];
    const result = await pool.query(query, values);
    
    logger.database('UPSERT', 'dialog_state', { 
      userId, 
      status,
      contextKeys: Object.keys(context)
    });
    
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to set dialog state', error, { userId, status });
    throw error;
  }
}

// Clear user's dialog state
async function clearDialogState(userId) {
  try {
    const query = 'DELETE FROM dialog_state WHERE user_id = $1';
    await pool.query(query, [userId]);
    
    logger.database('DELETE', 'dialog_state', { userId });
    
    return true;
  } catch (error) {
    logger.error('Failed to clear dialog state', error, { userId });
    throw error;
  }
}

// Handle dialog state based on current status
async function handleDialogState(userId, message, currentState) {
  try {
    const status = currentState.status;
    const context = currentState.context || {};
    let response = '';
    let nextStatus = null;
    let nextContext = { ...context };
    let action = 'chat_response';
    
    logger.info('Processing dialog state', { userId, status, contextKeys: Object.keys(context) });
    
    // Handle different dialog states
    switch (status) {
      case 'waiting_for_card_name':
        // Save the card name to context
        nextContext.cardName = message;
        nextStatus = 'waiting_for_card_title';
        response = 'Отлично! Теперь укажите должность или профессиональный титул для визитки.';
        break;
        
      case 'waiting_for_card_title':
        // Save the card title to context
        nextContext.cardTitle = message;
        nextStatus = 'waiting_for_card_company';
        response = 'Хорошо! Укажите название компании или организации.';
        break;
        
      case 'waiting_for_card_company':
        // Save the company name to context
        nextContext.cardCompany = message;
        nextStatus = 'waiting_for_card_contacts';
        response = 'Отлично! Теперь укажите контактную информацию (телефон, email, и т.д.).';
        break;
        
      case 'waiting_for_card_contacts':
        // Save the contacts to context
        nextContext.cardContacts = message;
        nextStatus = null; // Clear the state after this step
        
        // Generate a complete response with all collected information
        response = `Спасибо! Я собрал всю необходимую информацию для вашей визитки:
        
Имя: ${nextContext.cardName}
Должность: ${nextContext.cardTitle}
Компания: ${nextContext.cardCompany}
Контакты: ${nextContext.cardContacts}

Сейчас я создам визитку на основе этих данных.`;

        // Here you would typically call a function to generate the business card
        // For now, we'll just set the action to start the card flow
        action = 'start_card_flow';
        break;
        
      // Add more states as needed for other flows
      
      default:
        // Unknown state, clear it
        logger.warn('Unknown dialog state encountered', { userId, status });
        await clearDialogState(userId);
        return null;
    }
    
    // Update dialog state if nextStatus is provided, otherwise clear it
    if (nextStatus) {
      await setDialogState(userId, nextStatus, nextContext);
    } else {
      await clearDialogState(userId);
    }
    
    // Save bot response to chat history
    await saveMessage(userId, 'bot', response);
    
    logger.success('Dialog state processed', { 
      userId, 
      currentStatus: status,
      nextStatus: nextStatus || 'cleared'
    });
    
    return {
      action,
      message: response,
      context: nextContext
    };
    
  } catch (error) {
    logger.error('Failed to handle dialog state', error, { 
      userId, 
      status: currentState?.status || 'unknown' 
    });
    
    // В случае ошибки очищаем состояние диалога, чтобы не застрять в некорректном состоянии
    try {
      await clearDialogState(userId);
    } catch (clearError) {
      logger.error('Failed to clear dialog state after error', clearError, { userId });
    }
    
    throw error;
  }
}

// Check for trigger words in message
function checkForTriggers(message) {
  const lowerMessage = message.toLowerCase();
  
  for (const [trigger, action] of Object.entries(triggerRouter)) {
    if (lowerMessage.includes(trigger)) {
      logger.info('Trigger word detected', { trigger, action, messageLength: message.length });
      return { action };
    }
  }
  
  return null;
}

// Check for business card related queries
function isBusinessCardQuery(message) {
  const lowerMessage = message.toLowerCase();
  const cardQueries = [
    'мои визитки', 
    'найди мою визитку', 
    'я делал визитки',
    'моя визитка',
    'мои карточки',
    'найди мои визитки'
  ];
  
  const isCardQuery = cardQueries.some(query => lowerMessage.includes(query));
  
  if (isCardQuery) {
    logger.info('Business card query detected', { messageLength: message.length });
  }
  
  return isCardQuery;
}

// Find user's business cards
async function findUserCards(userId) {
  try {
    const query = 'SELECT * FROM generated_cards WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    
    logger.database('SELECT', 'generated_cards', { 
      userId, 
      cardsFound: result.rows.length 
    });
    
    return result.rows;
  } catch (error) {
    logger.error('Failed to find user cards', error, { userId });
    throw error;
  }
}

// Format card links for response
function formatCardLinks(cards) {
  if (!cards || cards.length === 0) {
    return null;
  }
  
  logger.debug('Formatting card links', { cardCount: cards.length });
  
  return cards.map((card, index) => {
    // Extract file name from URL to make it more readable
    const fileName = card.file_url.split('/').pop() || `Визитка ${index + 1}`;
    return `[${fileName}](${card.file_url})`;
  }).join(', ');
}

// Get response from AI model
async function getAIResponse(systemPrompt, userMessage) {
  try {
    logger.api('OpenRouter', 'chat completion request', { 
      model: 'anthropic/claude-3.5-sonnet',
      messageLength: userMessage.length,
      systemPromptLength: systemPrompt.length
    });
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      }
    });
    
    logger.success('AI response received', { 
      responseLength: response.data.choices[0].message.content.length,
      model: 'anthropic/claude-3.5-sonnet'
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error('Failed to get AI response', error, { 
      model: 'anthropic/claude-3.5-sonnet',
      messageLength: userMessage.length
    });
    throw error;
  }
}

// Initialize dialog state for specific flows
async function initializeDialogState(userId, action) {
  try {
    let status = null;
    let context = {};
    let response = '';
    
    switch (action) {
      case 'start_card_flow':
        status = 'waiting_for_card_name';
        response = 'Давайте создадим визитку! Пожалуйста, укажите ваше имя и фамилию для визитки.';
        break;
      
      // Add more flow initializations as needed
      
      default:
        return null;
    }
    
    if (status) {
      await setDialogState(userId, status, context);
      
      // Save bot response to chat history
      await saveMessage(userId, 'bot', response);
      
      logger.info('Dialog state initialized', { userId, status, action });
      
      return {
        action: 'chat_response',
        message: response
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to initialize dialog state', error, { userId, action });
    
    // В случае ошибки очищаем состояние диалога, чтобы не застрять в некорректном состоянии
    try {
      await clearDialogState(userId);
    } catch (clearError) {
      logger.error('Failed to clear dialog state after initialization error', clearError, { userId });
    }
    
    throw error;
  }
}

// Get chat history for a user
async function getChatHistory(userId) {
  try {
    const query = 'SELECT * FROM chat_history WHERE user_id = $1 ORDER BY created_at ASC';
    const result = await pool.query(query, [userId]);
    
    logger.database('SELECT', 'chat_history', { 
      userId, 
      count: result.rows.length 
    });
    
    return result.rows;
  } catch (error) {
    logger.error('Failed to get chat history', error, { userId });
    throw error;
  }
}

// POST /api/chat endpoint
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, userId } = req.body;
    
    if (!message || !userId) {
      logger.warn('Invalid chat request - missing required fields', { 
        hasMessage: !!message, 
        hasUserId: !!userId 
      });
      return res.status(400).json({ error: 'Message and userId are required' });
    }
    
    logger.info('Processing chat message', { 
      userId, 
      messageLength: message.length,
      messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : '')
    });
    
    // Save user message to chat history
    await saveMessage(userId, 'user', message);
    
    // Check for active dialog state
    const dialogState = await getDialogState(userId);
    
    if (dialogState) {
      // User has an active dialog state, process it
      logger.info('Active dialog state found', { 
        userId, 
        status: dialogState.status 
      });
      
      const stateResponse = await handleDialogState(userId, message, dialogState);
      
      if (stateResponse) {
        logger.success('Dialog state handled', { 
          userId, 
          action: stateResponse.action,
          processingTime: Date.now() - startTime
        });
        
        return res.json(stateResponse);
      }
      // If stateResponse is null, continue with normal flow
    }
    
    // Special handling for business card queries
    if (isBusinessCardQuery(message)) {
      // Find user's cards in the database
      const userCards = await findUserCards(userId);
      
      if (userCards && userCards.length > 0) {
        // Cards found, format links for response
        const cardLinks = formatCardLinks(userCards);
        const response = `Я нашел в нашей базе ваши ранее созданные визитки. Вот ссылки на них: ${cardLinks}`;
        
        // Save bot response to chat history
        await saveMessage(userId, 'bot', response);
        
        logger.success('Business cards found and returned', { 
          userId, 
          cardCount: userCards.length,
          processingTime: Date.now() - startTime
        });
        
        return res.json({
          action: 'chat_response',
          message: response
        });
      } else {
        // No cards found, suggest creating a new one
        const response = "Я проверил базу данных созданных визиток, но не нашел там ни одной для вашего профиля. Давайте сгенерируем новую, это займет пару минут!";
        
        // Save bot response to chat history
        await saveMessage(userId, 'bot', response);
        
        logger.info('No business cards found, suggesting card creation', { 
          userId,
          processingTime: Date.now() - startTime
        });
        
        return res.json({
          action: 'start_card_flow',
          message: response
        });
      }
    }
    
    // Regular trigger word check
    const triggerAction = checkForTriggers(message);
    if (triggerAction) {
      // Initialize dialog state for the triggered action
      const stateResponse = await initializeDialogState(userId, triggerAction.action);
      
      if (stateResponse) {
        logger.success('Dialog state initialized for trigger', { 
          userId, 
          action: triggerAction.action,
          processingTime: Date.now() - startTime
        });
        
        return res.json(stateResponse);
      }
      
      // If no state initialization, return the trigger action
      logger.success('Trigger action executed', { 
        userId, 
        action: triggerAction.action,
        processingTime: Date.now() - startTime
      });
      
      return res.json(triggerAction);
    }
    
    // If no triggers found, process as general conversation
    const systemPrompt = await getSystemPrompt();
    const aiResponse = await getAIResponse(systemPrompt, message);
    
    // Save bot response to chat history
    await saveMessage(userId, 'bot', aiResponse);
    
    logger.success('Chat conversation completed', { 
      userId,
      responseLength: aiResponse.length,
      processingTime: Date.now() - startTime
    });
    
    // Return response to frontend
    return res.json({ 
      action: 'chat_response', 
      message: aiResponse 
    });
    
  } catch (error) {
    logger.error('Chat processing failed', error, { 
      userId: req.body?.userId,
      processingTime: Date.now() - startTime
    });
    res.status(500).json({ error: 'An error occurred while processing your message' });
  }
});

// Route to get chat history
router.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const history = await getChatHistory(userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

module.exports = router; 