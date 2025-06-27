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
  logger.info('Supabase client initialized in goals router');
} else {
  logger.warn('Supabase environment variables not set or contain default values. Supabase client not initialized in goals router.');
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
          content: `Пользователь работает с целями команды, и возникла следующая ситуация: ${context}. 
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

// Validate goal data
function validateGoal(data) {
  const { title, userId } = data;
  
  if (!title) {
    return { valid: false, message: 'Необходимое поле отсутствует: title обязателен' };
  }
  
  if (!userId) {
    return { valid: false, message: 'Необходимое поле отсутствует: userId обязателен' };
  }
  
  return { valid: true };
}

// GET /api/goals - Get all team goals with creator names
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    // Use Supabase to query goals without JOIN to profiles
    const { data, error } = await supabase
      .from('team_goals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    res.json(data || []);
    
  } catch (error) {
    logger.error('Error fetching goals:', error);
    res.status(500).json({ 
      error: 'Не удалось получить список целей команды',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/goals - Interactive goal addition (first step)
router.post('/', async (req, res) => {
  try {
    const goalData = req.body;
    
    // Basic validation
    const validation = validateGoal(goalData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const { title, description, userId } = goalData;
    
    // Check for existing goal with same title by this user
    const { data: existingGoal, error: searchError } = await supabase
      .from('team_goals')
      .select('*')
      .ilike('title', title)
      .eq('user_id', userId)
      .limit(1);
    
    if (searchError) {
      throw searchError;
    }
    
    if (existingGoal && existingGoal.length > 0) {
      // Found existing goal - generate AI message
      const context = `Пользователь пытается добавить цель "${title}", но у него уже есть похожая цель с таким названием.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(300).json({
        status: 'confirm_update',
        message: aiMessage || `У вас уже есть похожая цель: «${title}». Хотите обновить ее детали или создать новую?`,
        existingId: existingGoal[0].id
      });
    }
    
    // No existing goal found - ask for more details
    const context = `Пользователь добавляет новую цель "${title}" и нам нужно запросить дополнительную информацию о приоритете, сроке и пользе.`;
    const aiMessage = await generateAIResponse(context);
    
    return res.json({
      status: 'clarify_details',
      message: aiMessage || 'Отличная цель! Давайте уточним детали. Какой у нее приоритет, срок выполнения и польза для команды?'
    });
    
  } catch (error) {
    console.error('Error processing goal:', error);
    res.status(500).json({ 
      error: 'Не удалось обработать запрос',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/goals/:id? - Update existing goal or finalize creation
router.put('/:id?', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    const goalId = req.params.id;
    const goalData = req.body;
    
    // Basic validation
    const validation = validateGoal(goalData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const { 
      title, 
      description, 
      status = 'В процессе', 
      priority, 
      term, 
      benefit, 
      userId 
    } = goalData;
    
    // Case 1: Updating existing goal
    if (goalId) {
      // Check if goal exists and belongs to user
      const { data: existingGoal, error: checkError } = await supabase
        .from('team_goals')
        .select('*')
        .eq('id', goalId)
        .single();
      
      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Цель не найдена' });
        }
        throw checkError;
      }
      
      // Check if user has permission (goal belongs to user)
      if (existingGoal.user_id !== userId) {
        const context = `Пользователь пытается отредактировать цель "${existingGoal.title}", но не имеет на это прав, так как ее создал другой пользователь.`;
        const aiMessage = await generateAIResponse(context);
        
        return res.status(403).json({ 
          error: 'У вас нет прав для редактирования этой цели',
          message: aiMessage
        });
      }
      
      // Update goal
      const { data: updatedGoal, error: updateError } = await supabase
        .from('team_goals')
        .update({ 
          title, 
          description, 
          status, 
          priority, 
          term, 
          benefit,
          due_date: goalData.due_date || existingGoal.due_date
        })
        .eq('id', goalId)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      // Generate success message
      const context = `Пользователь успешно обновил цель "${title}" с новыми параметрами.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.json({
        status: 'updated',
        message: aiMessage || `Цель «${title}» успешно обновлена.`,
        goal: updatedGoal
      });
    }
    // Case 2: Finalizing creation of a new goal
    else {
      // Create new goal with all details
      const { data: newGoal, error: insertError } = await supabase
        .from('team_goals')
        .insert([
          { 
            user_id: userId, 
            title, 
            description: description || null, 
            status, 
            priority: priority || null,
            term: term || null,
            benefit: benefit || null,
            due_date: goalData.due_date || null
          }
        ])
        .select()
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      // Generate success message
      const context = `Пользователь успешно создал новую цель "${title}" с параметрами: приоритет ${priority || 'не указан'}, срок ${term || 'не указан'}, польза ${benefit || 'не указана'}.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(201).json({
        status: 'created',
        message: aiMessage || `Готово! Новая цель «${title}» добавлена.`,
        goal: newGoal
      });
    }
    
  } catch (error) {
    logger.error('Error processing goal:', error);
    res.status(500).json({ 
      error: 'Не удалось обработать запрос',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
