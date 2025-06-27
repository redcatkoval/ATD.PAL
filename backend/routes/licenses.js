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
  logger.info('Supabase client initialized in licenses router');
} else {
  logger.warn('Supabase environment variables not set or contain default values. Supabase client not initialized in licenses router.');
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
          content: `Пользователь работает с лицензиями, и возникла следующая ситуация: ${context}. 
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

// Validate license data
function validateLicense(data) {
  const { service_name } = data;
  
  if (!service_name) {
    return { valid: false, message: 'Необходимые поля отсутствуют: service_name обязателен' };
  }
  
  return { valid: true };
}

// Verify codeword
function verifyCodeword(codeword) {
  const storedCodeword = process.env.LICENSE_CODEWORD;
  return codeword === storedCodeword;
}

// GET /api/licenses - Get all licenses (public info only) with optional search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    
    // Start query with public fields only
    let query = supabase
      .from('licenses')
      .select('id, service_name, description');
    
    // Apply search filter if provided
    if (search) {
      query = query.or(`service_name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Sort by service name
    query = query.order('service_name');
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json(data || []);
    
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ 
      error: 'Не удалось получить список лицензий',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/licenses/access - Get full license details with codeword
router.post('/access', async (req, res) => {
  try {
    const { service_name, codeword } = req.body;
    
    // Validate input
    if (!service_name || !codeword) {
      return res.status(400).json({ 
        error: 'Необходимо указать название сервиса и кодовое слово' 
      });
    }
    
    // Verify codeword
    if (!verifyCodeword(codeword)) {
      return res.status(401).json({ 
        error: 'Неверное кодовое слово' 
      });
    }
    
    // Get full license details
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .ilike('service_name', service_name)
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          error: `Лицензия для сервиса "${service_name}" не найдена` 
        });
      }
      throw error;
    }
    
    res.json(data);
    
  } catch (error) {
    console.error('Error accessing license:', error);
    res.status(500).json({ 
      error: 'Не удалось получить данные лицензии',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/licenses - Interactive license addition
router.post('/', async (req, res) => {
  try {
    const licenseData = req.body;
    
    // Basic validation
    const validation = validateLicense(licenseData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const { service_name, userId } = licenseData;
    
    // Check for existing license with same service name (case insensitive)
    const { data: existingLicense, error: searchError } = await supabase
      .from('licenses')
      .select('id')
      .ilike('service_name', service_name)
      .limit(1);
    
    if (searchError) {
      throw searchError;
    }
    
    // If a license with this service name already exists
    if (existingLicense && existingLicense.length > 0) {
      return res.status(300).json({
        status: 'confirm_update',
        message: `Лицензия для «${service_name}» уже есть. Хотите обновить?`,
        existingId: existingLicense[0].id
      });
    }
    
    // If no existing license found, ask for credentials
    return res.json({
      status: 'details_needed',
      message: `Отлично, давайте добавим «${service_name}». Введите все данные.`
    });
    
  } catch (error) {
    console.error('Error processing license:', error);
    res.status(500).json({ 
      error: 'Не удалось обработать запрос',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/licenses/:id - Update existing license
router.put('/:id', async (req, res) => {
  try {
    const licenseId = req.params.id;
    const licenseData = req.body;
    
    const { service_name, description, login, password, notes, userId, codeword } = licenseData;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен для обновления лицензии' });
    }
    
    // Verify codeword
    if (!codeword || !verifyCodeword(codeword)) {
      return res.status(401).json({ 
        error: 'Необходимо указать верное кодовое слово для редактирования лицензии' 
      });
    }
    
    // Check if license exists
    const { data: existingLicense, error: checkError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Лицензия не найдена' });
      }
      throw checkError;
    }
    
    // Check if user has permission (resource belongs to user)
    if (existingLicense.user_id && existingLicense.user_id !== userId) {
      const context = `Пользователь пытается отредактировать лицензию для "${existingLicense.service_name}", но не имеет на это прав, так как ее добавил другой пользователь.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(403).json({ 
        error: 'У вас нет прав на редактирование этой лицензии, так как ее добавил другой пользователь',
        message: aiMessage
      });
    }
    
    // Prepare update data
    const updateData = {
      user_id: userId // Always update the user who made the last change
    };
    
    // Only include fields that were provided
    if (service_name !== undefined) updateData.service_name = service_name;
    if (description !== undefined) updateData.description = description;
    if (login !== undefined) updateData.login = login;
    if (password !== undefined) updateData.password = password;
    if (notes !== undefined) updateData.notes = notes;
    
    // Check if service_name was changed and if it conflicts with existing licenses
    if (service_name && service_name !== existingLicense.service_name) {
      const { data: nameConflict, error: nameCheckError } = await supabase
        .from('licenses')
        .select('id')
        .neq('id', licenseId) // Exclude current license
        .ilike('service_name', service_name)
        .limit(1);
      
      if (nameCheckError) {
        throw nameCheckError;
      }
      
      if (nameConflict && nameConflict.length > 0) {
        const context = `Пользователь пытается изменить название лицензии на "${service_name}", но лицензия с таким названием уже существует.`;
        const aiMessage = await generateAIResponse(context);
        
        return res.status(409).json({
          error: 'Лицензия с таким названием уже существует',
          message: aiMessage
        });
      }
    }
    
    // Update license
    const { data: updatedLicense, error: updateError } = await supabase
      .from('licenses')
      .update(updateData)
      .eq('id', licenseId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    return res.status(200).json({
      status: 'updated',
      message: `Данные лицензии успешно обновлены.`,
      license: updatedLicense
    });
    
  } catch (error) {
    console.error('Error updating license:', error);
    res.status(500).json({ 
      error: 'Не удалось обновить лицензию',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/licenses/create - Create a new license with full details
router.post('/create', async (req, res) => {
  try {
    const licenseData = req.body;
    
    // Basic validation
    const validation = validateLicense(licenseData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const { service_name, description, login, password, notes, userId } = licenseData;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен для создания лицензии' });
    }
    
    // Check for existing license with same service name
    const { data: existingLicense, error: searchError } = await supabase
      .from('licenses')
      .select('id')
      .ilike('service_name', service_name)
      .limit(1);
    
    if (searchError) {
      throw searchError;
    }
    
    // If a license with this service name already exists, return conflict error
    if (existingLicense && existingLicense.length > 0) {
      const context = `Пользователь пытается создать лицензию для "${service_name}", но такая лицензия уже существует.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(409).json({
        error: 'Конфликт: лицензия с таким названием уже существует',
        message: aiMessage,
        existingId: existingLicense[0].id
      });
    }
    
    // Create new license
    const { data: newLicense, error: insertError } = await supabase
      .from('licenses')
      .insert([
        { 
          user_id: userId,
          service_name,
          description: description || null,
          login: login || null,
          password: password || null,
          notes: notes || null
        }
      ])
      .select()
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    return res.status(201).json({
      status: 'created',
      message: `Лицензия для «${service_name}» успешно добавлена.`,
      license: newLicense
    });
    
  } catch (error) {
    console.error('Error creating license:', error);
    res.status(500).json({ 
      error: 'Не удалось создать лицензию',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
