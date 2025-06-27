require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./services/logger');

// Import routes
const chatRouter = require('./routes/chat');
const cardsRouter = require('./routes/cards');
const resourcesRouter = require('./routes/resources');
const booksRouter = require('./routes/books');
const goalsRouter = require('./routes/goals');
const guidesRouter = require('./routes/guides');
const licensesRouter = require('./routes/licenses');

// Initialize Express app
const app = express();

// Custom HTTP logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logger.http(req, res, responseTime);
  });
  
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  logger.info('Root route accessed');
  res.status(200).json({
    name: 'ATD.PAL API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      '/api/chat',
      '/api/cards',
      '/api/resources',
      '/api/books',
      '/api/goals',
      '/api/guides',
      '/api/licenses',
      '/health',
      '/docs'
    ],
    documentation: 'See /docs for API documentation'
  });
});

// Documentation route
app.get('/docs', (req, res) => {
  logger.info('Documentation route accessed');
  res.status(200).json({
    api_documentation: {
      name: 'ATD.PAL API',
      version: '1.0.0',
      description: 'API для помощника ATD.PAL',
      endpoints: [
        {
          path: '/api/chat',
          methods: ['POST'],
          description: 'Интерфейс чата с AI-ассистентом',
          parameters: {
            message: 'Текст сообщения от пользователя',
            userId: 'Идентификатор пользователя'
          },
          returns: {
            action: 'Тип действия (chat_response, start_card_flow, и т.д.)',
            message: 'Ответное сообщение от бота'
          }
        },
        {
          path: '/api/cards',
          methods: ['GET', 'POST', 'PUT'],
          description: 'Управление визитками',
          endpoints: [
            {
              path: '/api/cards',
              method: 'GET',
              description: 'Получение списка визиток пользователя',
              parameters: {
                userId: 'Идентификатор пользователя'
              }
            },
            {
              path: '/api/cards',
              method: 'POST',
              description: 'Создание новой визитки',
              parameters: {
                name: 'Имя',
                title: 'Должность',
                email: 'Email',
                phone: 'Телефон',
                userId: 'Идентификатор пользователя',
                size: 'Размер визитки (90x50 или 85x55)',
                theme: 'Тема оформления (dark или light)',
                qrCodeUrl: 'URL для QR-кода (опционально)'
              }
            }
          ]
        },
        {
          path: '/api/resources',
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          description: 'Управление дизайн-ресурсами'
        },
        {
          path: '/api/books',
          methods: ['GET', 'POST', 'PUT'],
          description: 'Управление библиотекой знаний'
        },
        {
          path: '/api/goals',
          methods: ['GET', 'POST', 'PUT'],
          description: 'Управление командными целями'
        },
        {
          path: '/api/guides',
          methods: ['GET', 'POST', 'PUT'],
          description: 'Управление инструкциями'
        },
        {
          path: '/api/licenses',
          methods: ['GET', 'POST', 'PUT'],
          description: 'Управление лицензиями'
        },
        {
          path: '/health',
          methods: ['GET'],
          description: 'Проверка состояния сервера',
          returns: {
            status: 'Статус сервера (ok)',
            timestamp: 'Текущее время сервера'
          }
        }
      ]
    }
  });
});

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/books', booksRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/guides', guidesRouter);
app.use('/api/licenses', licensesRouter);

// Basic health check endpoint
app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', { 
    method: req.method, 
    url: req.originalUrl,
    ip: req.ip 
  });
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error occurred', err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.success(`Server started successfully`, { 
    port: PORT, 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 