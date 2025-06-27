const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
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
  logger.info('Supabase client initialized in resources router');
} else {
  logger.warn('Supabase environment variables not set or contain default values. Supabase client not initialized in resources router.');
}

// Get system prompt for AI responses
async function getSystemPrompt() {
  try {
    const personaPath = path.join(__dirname, '..', 'persona.md');
    const personaContent = await fs.readFile(personaPath, 'utf8');
    return personaContent;
  } catch (error) {
    logger.error('Error reading persona file:', error);
    return 'You are ATD.PAL, a helpful assistant.'; // Fallback prompt
  }
}

// Generate friendly AI response for user interactions
async function generateAIResponse(context) {
  try {
    const systemPrompt = await getSystemPrompt();
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Пользователь работает с дизайн-ресурсами, и возникла следующая ситуация: ${context}. 
                    Напиши дружелюбное сообщение, объясняющее ситуацию и предлагающее решение. 
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
    logger.error('Error generating AI response:', error);
    // Return generic message if AI fails
    return 'Произошла ошибка при обработке вашего запроса. Пожалуйста, проверьте данные и попробуйте снова.';
  }
}

// Validate resource data
function validateResource(data) {
  const { name, link, user_id } = data;
  
  if (!name || !link || !user_id) {
    return { valid: false, message: 'Необходимые поля отсутствуют: name, link и user_id обязательны' };
  }
  
  return { valid: true };
}

// GET /api/resources - Get resources (with optional search)
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    const { search } = req.query;
    let query = supabase.from('design_resources').select('*');
    
    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Sort by created_at (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Return empty array if no results (frontend will handle this)
    res.json(data || []);
    
  } catch (error) {
    logger.error('Error fetching resources:', error);
    res.status(500).json({ 
      error: 'Не удалось получить ресурсы',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/resources - Create new resource with smart validation
router.post('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    const resourceData = req.body;
    
    // Basic validation
    const validation = validateResource(resourceData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const { name, link, description, user_id } = resourceData;
    
    // 1. Check for exact match (same name AND link) - case insensitive
    const { data: exactMatch, error: exactMatchError } = await supabase
      .from('design_resources')
      .select('*')
      .ilike('name', name)
      .ilike('link', link)
      .limit(1);
    
    if (exactMatchError) {
      throw exactMatchError;
    }
    
    if (exactMatch && exactMatch.length > 0) {
      // Exact duplicate found - generate AI message
      const context = `Ресурс с названием "${name}" и ссылкой "${link}" уже существует в базе данных. Пользователь пытается добавить дубликат.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(300).json({
        status: 'exact_match',
        message: aiMessage,
        existingId: exactMatch[0].id
      });
    }
    
    // 2. Check for partial match (same name OR link) - case insensitive
    const { data: partialMatch, error: partialMatchError } = await supabase
      .from('design_resources')
      .select('*')
      .or(`name.ilike."${name}",link.ilike."${link}"`)
      .limit(1);
    
    if (partialMatchError) {
      throw partialMatchError;
    }
    
    if (partialMatch && partialMatch.length > 0) {
      // Partial match found - generate AI message
      const matchType = partialMatch[0].name.toLowerCase() === name.toLowerCase() ? 'названием' : 'ссылкой';
      const matchValue = partialMatch[0].name.toLowerCase() === name.toLowerCase() ? name : link;
      const context = `Найден ресурс с похожими данными (${matchType} "${matchValue}"). Пользователь пытается добавить похожий ресурс.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(300).json({
        status: 'partial_match',
        message: aiMessage,
        existingId: partialMatch[0].id
      });
    }
    
    // 3. No matches found - create new resource
    const { data: newResource, error: insertError } = await supabase
      .from('design_resources')
      .insert([
        { user_id, name, description, link }
      ])
      .select()
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    res.status(201).json({
      status: 'created',
      resource: newResource
    });
    
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ 
      error: 'Не удалось создать ресурс',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/resources/:id - Update existing resource
router.put('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    const resourceId = req.params.id;
    const resourceData = req.body;
    
    // Basic validation
    const validation = validateResource(resourceData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const { name, link, description, user_id } = resourceData;
    
    // Check if resource exists and belongs to user
    const { data: existingResource, error: checkError } = await supabase
      .from('design_resources')
      .select('*')
      .eq('id', resourceId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Ресурс не найден' });
      }
      throw checkError;
    }
    
    // Check if user has permission (resource belongs to user)
    if (existingResource.user_id !== user_id) {
      const context = `Пользователь пытается отредактировать ресурс "${existingResource.name}", который был создан другим пользователем.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(403).json({ 
        error: 'У вас нет прав для редактирования этого ресурса',
        message: aiMessage
      });
    }
    
    // Update resource
    const { data: updatedResource, error: updateError } = await supabase
      .from('design_resources')
      .update({ name, description, link })
      .eq('id', resourceId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    res.json({
      status: 'updated',
      resource: updatedResource
    });
    
  } catch (error) {
    logger.error('Error updating resource:', error);
    res.status(500).json({ 
      error: 'Не удалось обновить ресурс',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/resources/:id - Delete resource
router.delete('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    const resourceId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id обязателен для удаления ресурса' });
    }
    
    // Check if resource exists and belongs to user
    const { data: existingResource, error: checkError } = await supabase
      .from('design_resources')
      .select('*')
      .eq('id', resourceId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Ресурс не найден' });
      }
      throw checkError;
    }
    
    // Check if user has permission (resource belongs to user)
    if (existingResource.user_id !== user_id) {
      const context = `Пользователь пытается удалить ресурс "${existingResource.name}", который был создан другим пользователем.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(403).json({ 
        error: 'У вас нет прав для удаления этого ресурса',
        message: aiMessage
      });
    }
    
    // Delete resource
    const { error: deleteError } = await supabase
      .from('design_resources')
      .delete()
      .eq('id', resourceId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    res.json({
      status: 'deleted',
      resourceId
    });
    
  } catch (error) {
    logger.error('Error deleting resource:', error);
    res.status(500).json({ 
      error: 'Не удалось удалить ресурс',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
