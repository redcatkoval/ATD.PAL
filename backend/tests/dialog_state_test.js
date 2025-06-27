const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Загрузка переменных окружения из .env файла
dotenv.config();

// Базовый URL API
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Проверка наличия API_URL
if (!process.env.API_URL) {
  console.warn('\x1b[33m%s\x1b[0m', 'Внимание: API_URL не найден в .env файле. Используется значение по умолчанию: ' + API_URL);
}

// Тестовый пользователь
const testUserId = `test-${uuidv4()}`;

// Функция для отправки сообщения в чат
async function sendChatMessage(message) {
  try {
    console.log(`Отправка сообщения: "${message}"`);
    const response = await axios.post(`${API_URL}/api/chat`, {
      message,
      userId: testUserId
    });
    
    console.log('Ответ:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error.message);
    if (error.response) {
      console.error('Данные ответа:', error.response.data);
    }
    throw error;
  }
}

// Основная функция тестирования
async function runTest() {
  try {
    console.log('=== Тестирование системы управления состоянием диалога ===');
    console.log(`Тестовый пользователь: ${testUserId}`);
    console.log(`API URL: ${API_URL}`);
    
    // Шаг 1: Инициализация диалога с триггер-словом
    console.log('\n=== Шаг 1: Инициализация диалога с триггер-словом ===');
    let response = await sendChatMessage('Я хочу создать визитку');
    
    // Шаг 2: Отправка имени (первое состояние диалога)
    console.log('\n=== Шаг 2: Отправка имени ===');
    response = await sendChatMessage('Иван Петров');
    
    // Шаг 3: Отправка должности (второе состояние диалога)
    console.log('\n=== Шаг 3: Отправка должности ===');
    response = await sendChatMessage('Старший разработчик');
    
    // Шаг 4: Отправка компании (третье состояние диалога)
    console.log('\n=== Шаг 4: Отправка компании ===');
    response = await sendChatMessage('ООО "Технологии будущего"');
    
    // Шаг 5: Отправка контактов (четвертое состояние диалога)
    console.log('\n=== Шаг 5: Отправка контактов ===');
    response = await sendChatMessage('Телефон: +7 999 123-45-67, Email: ivan@example.com');
    
    // Шаг 6: Проверка, что состояние диалога сброшено
    console.log('\n=== Шаг 6: Проверка, что состояние диалога сброшено ===');
    response = await sendChatMessage('Привет, как дела?');
    
    console.log('\n=== Тестирование завершено успешно! ===');
  } catch (error) {
    console.error('\n=== Тестирование завершилось с ошибкой ===', error);
  }
}

// Запуск теста
runTest(); 