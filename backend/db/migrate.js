require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Функция для цветного вывода в консоль
const consoleColors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Основная функция миграции
async function runMigration() {
  // Проверяем наличие DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error(`${consoleColors.red}❌ Ошибка: DATABASE_URL не найден в переменных окружения${consoleColors.reset}`);
    console.error(`${consoleColors.yellow}💡 Убедитесь, что файл .env существует и содержит DATABASE_URL${consoleColors.reset}`);
    process.exit(1);
  }

  console.log(`${consoleColors.blue}🔗 Используется DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@')}${consoleColors.reset}`);

  const client = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    // Тестируем подключение
    console.log(`${consoleColors.yellow}📡 Тестирование подключения к Supabase...${consoleColors.reset}`);
    const testResult = await client.query('SELECT version()');
    console.log(`${consoleColors.green}✅ Подключение успешно! PostgreSQL версия: ${testResult.rows[0].version.split(' ')[1]}${consoleColors.reset}`);

    // Читаем файл схемы
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`${consoleColors.yellow}📄 Чтение файла схемы: ${schemaPath}${consoleColors.reset}`);
    
    let sqlScript = await fs.readFile(schemaPath, 'utf8');
    
    // Удаляем проблематичные ALTER TABLE команды, если они есть
    sqlScript = sqlScript.replace(/ALTER TABLE generated_cards ADD COLUMN back_file_url TEXT NOT NULL;?\s*/g, '');
    sqlScript = sqlScript.replace(/ALTER TABLE team_goals ADD COLUMN priority TEXT;?\s*/g, '');
    sqlScript = sqlScript.replace(/ALTER TABLE team_goals ADD COLUMN term TEXT;?\s*/g, '');
    sqlScript = sqlScript.replace(/ALTER TABLE team_goals ADD COLUMN benefit TEXT;?\s*/g, '');
    
    console.log(`${consoleColors.blue}📝 Размер SQL-скрипта: ${sqlScript.length} символов${consoleColors.reset}`);

    // Выполняем SQL-скрипт
    console.log(`${consoleColors.yellow}🔄 Выполнение SQL-скрипта...${consoleColors.reset}`);
    await client.query(sqlScript);

    // Читаем и выполняем дополнительные миграции из директории migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    console.log(`${consoleColors.yellow}📁 Чтение директории миграций: ${migrationsDir}${consoleColors.reset}`);
    
    try {
      const migrationFiles = await fs.readdir(migrationsDir);
      
      for (const file of migrationFiles) {
        if (file.endsWith('.sql')) {
          console.log(`${consoleColors.yellow}📄 Чтение файла миграции: ${file}${consoleColors.reset}`);
          const migrationPath = path.join(migrationsDir, file);
          const migrationSql = await fs.readFile(migrationPath, 'utf8');
          
          console.log(`${consoleColors.blue}🔄 Выполнение миграции: ${file}${consoleColors.reset}`);
          await client.query(migrationSql);
          console.log(`${consoleColors.green}✅ Миграция ${file} успешно выполнена!${consoleColors.reset}`);
        }
      }
    } catch (migrationError) {
      console.error(`${consoleColors.red}❌ Ошибка при выполнении миграций:${consoleColors.reset}`, migrationError);
      // Продолжаем выполнение, не останавливаемся при ошибке миграции
    }

    // Выводим сообщение об успехе
    console.log(`${consoleColors.green}✅ Миграция базы данных успешно завершена!${consoleColors.reset}`);
    
    // Проверяем созданные таблицы
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`${consoleColors.green}📋 Созданные таблицы:${consoleColors.reset}`);
    tablesResult.rows.forEach(row => {
      console.log(`${consoleColors.green}  ✓ ${row.table_name}${consoleColors.reset}`);
    });

  } catch (error) {
    // Выводим сообщение об ошибке
    console.error(`${consoleColors.red}❌ Ошибка при выполнении миграции:${consoleColors.reset}`);
    console.error(`${consoleColors.red}   Сообщение: ${error.message}${consoleColors.reset}`);
    
    // Для более подробной информации об ошибке
    if (error.position) {
      console.error(`${consoleColors.red}📍 Позиция ошибки в SQL: ${error.position}${consoleColors.reset}`);
    }
    
    if (error.code) {
      console.error(`${consoleColors.red}🔢 Код ошибки: ${error.code}${consoleColors.reset}`);
    }
    
    // Выводим полный стек ошибки для отладки
    if (process.env.NODE_ENV === 'development') {
      console.error(`${consoleColors.red}🔍 Полная ошибка:${consoleColors.reset}`, error);
    }
    
    // Выходим из процесса с ошибкой
    process.exit(1);
  } finally {
    // Закрываем соединение с базой данных
    await client.end();
    console.log(`${consoleColors.yellow}🔌 Соединение с базой данных закрыто${consoleColors.reset}`);
  }
}

// Запускаем миграцию
runMigration();
