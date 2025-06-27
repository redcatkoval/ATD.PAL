const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
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
  logger.info('Supabase client initialized in guides router');
} else {
  logger.warn('Supabase environment variables not set or contain default values. Supabase client not initialized in guides router.');
}

// Get system prompt for AI responses
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

// Generate friendly AI response
async function generateAIResponse(context) {
  try {
    const systemPrompt = await getSystemPrompt();
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Пользователь работает с инструкциями, и возникла следующая ситуация: ${context}. 
                    Напиши дружелюбное сообщение на русском языке, объясняющее ситуацию и предлагающее решение. 
                    Ответ должен быть кратким (не более 2 предложений) и конкретным.` 
        }
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
    // Return generic message if AI fails
    return 'Произошла ошибка при обработке вашего запроса. Пожалуйста, проверьте данные и попробуйте снова.';
  }
}

// Validate guide data
function validateGuide(data) {
  const { title } = data;
  
  if (!title) {
    return { valid: false, message: 'Необходимые поля отсутствуют: title обязателен' };
  }
  
  return { valid: true };
}

// GET /api/guides - Get all guides or a specific guide by title
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    const { title } = req.query;
    
    // Case 1: Get a specific guide by title
    if (title) {
      const { data, error } = await supabase
        .from('how_to_guides')
        .select('*')
        .ilike('title', title)
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return res.json(null); // Return null if no guide found
        }
        throw error;
      }
      
      return res.json(data);
    } 
    // Case 2: Get all guides
    else {
      const { data, error } = await supabase
        .from('how_to_guides')
        .select('*')
        .order('category')
        .order('title');
      
      if (error) {
        throw error;
      }
      
      return res.json(data || []);
    }
  } catch (error) {
    logger.error('Error fetching guides:', error);
    res.status(500).json({ 
      error: 'Не удалось получить инструкции',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/guides - Interactive guide addition
router.post('/', async (req, res) => {
  try {
    const guideData = req.body;
    
    // Basic validation
    const validation = validateGuide(guideData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const { title, content, category, userId } = guideData;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен для создания инструкции' });
    }
    
    // Check for existing guide with same title
    const { data: existingGuide, error: searchError } = await supabase
      .from('how_to_guides')
      .select('id')
      .ilike('title', title)
      .limit(1);
    
    if (searchError) {
      throw searchError;
    }
    
    // If a guide with this title already exists
    if (existingGuide && existingGuide.length > 0) {
      // Generate AI message about duplicate
      const context = `Пользователь пытается добавить инструкцию "${title}", но в базе уже есть инструкция с таким названием.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(300).json({
        status: 'confirm_update',
        message: aiMessage || `Инструкция с таким названием уже есть. Хотите обновить?`,
        existingId: existingGuide[0].id
      });
    }
    
    // If only title is provided (first step of creation)
    if (!content) {
      return res.json({
        status: 'content_needed',
        message: `Отлично! Теперь предоставьте текст инструкции.`
      });
    }
    
    // If both title and content are provided, create the guide
    const { data: newGuide, error: insertError } = await supabase
      .from('how_to_guides')
      .insert([
        { 
          user_id: userId, 
          title, 
          content,
          category: category || null
        }
      ])
      .select()
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    return res.status(201).json({
      status: 'created',
      message: `Инструкция успешно добавлена.`,
      guide: newGuide
    });
    
  } catch (error) {
    console.error('Error processing guide:', error);
    res.status(500).json({ 
      error: 'Не удалось обработать запрос',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/guides/:id - Update existing guide with security check
router.put('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    const guideId = req.params.id;
    const guideData = req.body;
    
    const { title, content, category, userId } = guideData;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен для обновления инструкции' });
    }
    
    if (!content) {
      return res.status(400).json({ error: 'content обязателен для обновления инструкции' });
    }
    
    // Check if guide exists
    const { data: existingGuide, error: checkError } = await supabase
      .from('how_to_guides')
      .select('*')
      .eq('id', guideId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Инструкция не найдена' });
      }
      throw checkError;
    }
    
    // Security check: verify that the user is the author of the guide
    if (existingGuide.user_id && existingGuide.user_id !== userId) {
      const context = `Пользователь пытается отредактировать инструкцию "${existingGuide.title}", но не имеет на это прав, так как ее создал другой пользователь.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(403).json({ 
        error: 'У вас нет прав на редактирование этой инструкции, так как ее создал другой пользователь',
        message: aiMessage
      });
    }
    
    // Prepare update data
    const updateData = {
      user_id: userId // Always update the user who made the last edit
    };
    
    // Only include fields that were provided
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    
    // If title was changed, check for conflicts
    if (title && title !== existingGuide.title) {
      const { data: titleConflict, error: titleCheckError } = await supabase
        .from('how_to_guides')
        .select('id')
        .neq('id', guideId) // Exclude current guide
        .ilike('title', title)
        .limit(1);
      
      if (titleCheckError) {
        throw titleCheckError;
      }
      
      if (titleConflict && titleConflict.length > 0) {
        const context = `Пользователь пытается изменить название инструкции на "${title}", но инструкция с таким названием уже существует.`;
        const aiMessage = await generateAIResponse(context);
        
        return res.status(409).json({
          error: 'Инструкция с таким названием уже существует',
          message: aiMessage
        });
      }
    }
    
    // Update guide
    const { data: updatedGuide, error: updateError } = await supabase
      .from('how_to_guides')
      .update(updateData)
      .eq('id', guideId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    return res.status(200).json({
      status: 'updated',
      message: `Инструкция успешно обновлена.`,
      guide: updatedGuide
    });
    
  } catch (error) {
    logger.error('Error updating guide:', error);
    res.status(500).json({ 
      error: 'Не удалось обновить инструкцию',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
