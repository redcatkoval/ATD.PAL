# Система структурированного логирования

## Обзор

Проект использует собственную систему структурированного логирования, которая обеспечивает:
- Цветной вывод в режиме разработки
- JSON формат в продакшене
- Различные уровни логирования
- Контекстную информацию
- Автоматическое логирование HTTP запросов и операций с БД

## Использование

### Импорт логгера

```javascript
const logger = require('./services/logger');
```

### Уровни логирования

#### INFO - Общая информация
```javascript
logger.info('User logged in', { userId: 123, email: 'user@example.com' });
```

#### SUCCESS - Успешные операции
```javascript
logger.success('Email sent successfully', { recipient: 'user@example.com', messageId: 'abc123' });
```

#### WARN - Предупреждения
```javascript
logger.warn('Rate limit approaching', { userId: 123, requestCount: 95, limit: 100 });
```

#### ERROR - Ошибки
```javascript
logger.error('Database connection failed', error, { 
  host: 'localhost', 
  database: 'myapp' 
});
```

#### DEBUG - Отладочная информация (только в development)
```javascript
logger.debug('Processing user data', { userId: 123, dataSize: '2.5MB' });
```

### Специализированные методы

#### HTTP запросы
```javascript
// Автоматически вызывается middleware в app.js
logger.http(req, res, responseTime);
```

#### Операции с базой данных
```javascript
logger.database('SELECT', 'users', { userId: 123, rowsFound: 1 });
```

#### API вызовы
```javascript
logger.api('OpenRouter', 'chat completion', { 
  model: 'claude-3.5-sonnet', 
  tokens: 150 
});
```

## Форматы вывода

### Development режим (цветной)
```
[2024-06-16T12:24:57.411Z] INFO User logged in {"userId":123,"email":"user@example.com"}
[2024-06-16T12:24:57.435Z] SUCCESS Email sent successfully {"recipient":"user@example.com"}
[2024-06-16T12:24:57.435Z] WARN Rate limit approaching {"userId":123,"requestCount":95}
[2024-06-16T12:24:57.435Z] ERROR Database connection failed {"error":{"message":"Connection timeout"}}
```

### Production режим (JSON)
```json
{"timestamp":"2024-06-16T12:24:57.411Z","level":"INFO","message":"User logged in","userId":123,"email":"user@example.com"}
{"timestamp":"2024-06-16T12:24:57.435Z","level":"SUCCESS","message":"Email sent successfully","recipient":"user@example.com"}
{"timestamp":"2024-06-16T12:24:57.435Z","level":"WARN","message":"Rate limit approaching","userId":123,"requestCount":95}
{"timestamp":"2024-06-16T12:24:57.435Z","level":"ERROR","message":"Database connection failed","error":{"message":"Connection timeout"}}
```

## Автоматическое логирование

### HTTP запросы
Все HTTP запросы автоматически логируются с информацией:
- Метод и URL
- Статус код
- Время ответа
- IP адрес
- User-Agent

### База данных
Все SQL запросы автоматически логируются с информацией:
- Время выполнения
- Количество затронутых строк
- Тип команды (SELECT, INSERT, UPDATE, DELETE)
- Предупреждения о медленных запросах (>1000ms)

### Пул соединений
Логируются события пула соединений:
- Подключение/отключение клиентов
- Ошибки соединений
- Статистика пула

## Лучшие практики

### 1. Используйте подходящий уровень
```javascript
// ✅ Правильно
logger.info('User action completed', { action: 'profile_update' });
logger.error('Payment failed', error, { orderId: 123 });

// ❌ Неправильно
logger.error('User clicked button'); // Это не ошибка
logger.info('Critical system failure'); // Это не просто информация
```

### 2. Добавляйте контекст
```javascript
// ✅ Правильно
logger.warn('High memory usage', { 
  usage: '85%', 
  threshold: '80%', 
  process: 'api-server' 
});

// ❌ Неправильно
logger.warn('High memory usage');
```

### 3. Не логируйте чувствительные данные
```javascript
// ✅ Правильно
logger.info('User authenticated', { 
  userId: user.id, 
  email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2') 
});

// ❌ Неправильно
logger.info('User authenticated', { password: user.password });
```

### 4. Используйте измерения производительности
```javascript
const startTime = Date.now();
// ... выполнение операции
logger.success('Operation completed', { 
  operation: 'data_processing',
  duration: Date.now() - startTime 
});
```

## Мониторинг и анализ

В production режиме логи выводятся в JSON формате, что позволяет:
- Легко парсить логи системами мониторинга (ELK, Splunk, etc.)
- Создавать дашборды и алерты
- Анализировать производительность
- Отслеживать ошибки и тренды

## Конфигурация

Поведение логгера зависит от переменной окружения `NODE_ENV`:
- `development` - цветной вывод, включены DEBUG логи
- `production` - JSON формат, DEBUG логи отключены 