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
  logger.info('Supabase client initialized in books router');
} else {
  logger.warn('Supabase environment variables not set or contain default values. Supabase client not initialized in books router.');
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
          content: `Пользователь работает с библиотекой знаний, и возникла следующая ситуация: ${context}. 
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
    logger.error('Error generating AI response:', error);
    // Return generic message if AI fails
    return 'Произошла ошибка при обработке вашего запроса. Пожалуйста, проверьте данные и попробуйте снова.';
  }
}

// Validate book data
function validateBook(data) {
  const { title, userId } = data;
  
  if (!title) {
    return { valid: false, message: 'Необходимое поле отсутствует: title обязателен' };
  }
  
  if (!userId) {
    return { valid: false, message: 'Необходимое поле отсутствует: userId обязателен' };
  }
  
  return { valid: true };
}

// Check if book data is complete for creation
function isBookDataComplete(data) {
  const { title, author, language } = data;
  return title && author && language;
}

// GET /api/books - Get books with optional filtering
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    const { language, search } = req.query;
    let query = supabase.from('knowledge_books')
      .select('*');
    
    // Apply language filter if provided
    if (language) {
      query = query.ilike('language', `%${language}%`);
    }
    
    // Apply search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }
    
    // Sort by title
    query = query.order('title');
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Return empty array if no results (frontend will handle this)
    res.json(data || []);
    
  } catch (error) {
    logger.error('Error fetching books:', error);
    res.status(500).json({ 
      error: 'Не удалось получить список книг',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/books - Interactive book addition
router.post('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Сервис временно недоступен',
        message: 'Supabase client not initialized' 
      });
    }
    
    const bookData = req.body;
    
    // Basic validation
    const validation = validateBook(bookData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const { title, author, language, summary, cover_image_url, userId } = bookData;
    
    // Step 1: Check if we need more information (pошаговый сбор данных)
    if (!isBookDataComplete(bookData)) {
      // Determine what information is missing
      const missingFields = [];
      if (!author) missingFields.push('автор');
      if (!language) missingFields.push('язык');
      
      // Generate appropriate AI message based on missing fields
      let context;
      if (missingFields.length === 2) {
        context = `Пользователь добавляет книгу "${title}", но не указал автора и язык. Нужно запросить эту информацию.`;
      } else if (missingFields[0] === 'автор') {
        context = `Пользователь добавляет книгу "${title}" на языке "${language}", но не указал автора. Нужно запросить эту информацию.`;
      } else {
        context = `Пользователь добавляет книгу "${title}" автора "${author}", но не указал язык. Нужно запросить эту информацию.`;
      }
      
      const aiMessage = await generateAIResponse(context);
      
      return res.json({
        status: 'more_info_needed',
        message: aiMessage || `Отличная книга! А ${missingFields.join(' и ')} ${missingFields.length > 1 ? 'какие' : 'какой'}?`,
        missing_fields: missingFields
      });
    }
    
    // Step 2: Check for exact match (same title, author AND language)
    const { data: exactMatch, error: exactMatchError } = await supabase
      .from('knowledge_books')
      .select('*')
      .ilike('title', title)
      .ilike('author', author)
      .ilike('language', language)
      .limit(1);
    
    if (exactMatchError) {
      throw exactMatchError;
    }
    
    if (exactMatch && exactMatch.length > 0) {
      // Exact duplicate found - generate AI message
      const context = `Книга "${title}" автора "${author}" на языке "${language}" уже существует в библиотеке. Пользователь пытается добавить дубликат.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(300).json({
        status: 'exact_match',
        message: aiMessage || `Такая книга уже есть в нашей библиотеке. Хотите обновить информацию о ней (например, обложку или описание)?`,
        existingId: exactMatch[0].id,
        options: [
          { action: 'update', label: 'Обновить информацию' },
          { action: 'cancel', label: 'Отменить добавление' }
        ]
      });
    }
    
    // Step 3: Check for partial match (same title and author, different language)
    const { data: partialMatch, error: partialMatchError } = await supabase
      .from('knowledge_books')
      .select('*')
      .ilike('title', title)
      .ilike('author', author)
      .not('language', 'ilike', `%${language}%`)
      .limit(1);
    
    if (partialMatchError) {
      throw partialMatchError;
    }
    
    if (partialMatch && partialMatch.length > 0) {
      // Partial match found - generate AI message
      const context = `Найдена похожая книга "${title}" автора "${author}", но на другом языке (${partialMatch[0].language}). Пользователь пытается добавить версию на ${language}.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(300).json({
        status: 'partial_match',
        message: aiMessage || `Нашел похожую книгу, но на другом языке (${partialMatch[0].language}). Хотите добавить новую версию на ${language} или обновить существующую?`,
        existingId: partialMatch[0].id,
        options: [
          { action: 'add_new', label: `Добавить новую версию на ${language}` },
          { action: 'update_existing', label: 'Обновить существующую' },
          { action: 'cancel', label: 'Отменить добавления' }
        ]
      });
    }
    
    // Step 4: No matches found - create new book
    const { data: newBook, error: insertError } = await supabase
      .from('knowledge_books')
      .insert([
        { 
          user_id: userId, 
          title, 
          author, 
          language, 
          summary: summary || null, 
          cover_image_url: cover_image_url || null
        }
      ])
      .select()
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    // Generate success message
    const context = `Пользователь успешно добавил книгу "${title}" автора "${author}" на языке "${language}" в библиотеку.`;
    const aiMessage = await generateAIResponse(context);
    
    res.status(201).json({
      status: 'created',
      message: aiMessage || `Готово! Книга «${title}» добавлена в библиотеку.`,
      book: newBook
    });
    
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ 
      error: 'Не удалось добавить книгу',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/books/:id - Update existing book
router.put('/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    const bookData = req.body;
    
    // Basic validation
    const validation = validateBook(bookData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const { title, author, language, summary, cover_image_url, userId } = bookData;
    
    // Check if book exists
    const { data: existingBook, error: checkError } = await supabase
      .from('knowledge_books')
      .select('*')
      .eq('id', bookId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Книга не найдена' });
      }
      throw checkError;
    }
    
    // Check if user has permission (book belongs to user)
    if (existingBook.user_id !== userId) {
      const context = `Пользователь пытается отредактировать книгу "${existingBook.title}", но не имеет на это прав, так как ее добавил другой пользователь.`;
      const aiMessage = await generateAIResponse(context);
      
      return res.status(403).json({ 
        error: 'У вас нет прав для редактирования этой книги',
        message: aiMessage
      });
    }
    
    // Update book
    const { data: updatedBook, error: updateError } = await supabase
      .from('knowledge_books')
      .update({ 
        title, 
        author, 
        language, 
        summary: summary || existingBook.summary, 
        cover_image_url: cover_image_url || existingBook.cover_image_url,
        user_id: userId // Update the user_id to track who made the last edit
      })
      .eq('id', bookId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    // Generate success message
    const context = `Пользователь успешно обновил информацию о книге "${title}" автора "${author}".`;
    const aiMessage = await generateAIResponse(context);
    
    res.json({
      status: 'updated',
      message: aiMessage || `Информация о книге «${title}» успешно обновлена.`,
      book: updatedBook
    });
    
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ 
      error: 'Не удалось обновить информацию о книге',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
