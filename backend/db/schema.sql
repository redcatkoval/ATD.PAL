-- ATD.PAL Database Schema
-- This file contains the complete database schema for the ATD.PAL project

-- Create tables
-- 1. Design Resources Table
CREATE TABLE IF NOT EXISTS design_resources (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    link TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, link)
);

COMMENT ON TABLE design_resources IS 'Collection of design resources like logos, guidelines, etc.';
COMMENT ON COLUMN design_resources.user_id IS 'Reference to the user who added the resource';
COMMENT ON COLUMN design_resources.name IS 'Name of the design resource';
COMMENT ON COLUMN design_resources.link IS 'URL or path to the design resource';

-- 2. Knowledge Books Table
CREATE TABLE IF NOT EXISTS knowledge_books (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    author TEXT,
    language TEXT,
    summary TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (title, author, language)
);

COMMENT ON TABLE knowledge_books IS 'Collection of books and knowledge resources';

-- 3. Team Goals Table
CREATE TABLE IF NOT EXISTS team_goals (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT DEFAULT 'В процессе',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE team_goals IS 'Team goals and objectives tracking';

-- Add new columns to team_goals table
ALTER TABLE public.team_goals ADD COLUMN IF NOT EXISTS priority TEXT; -- может быть 'низкий', 'средний', 'высокий'
ALTER TABLE public.team_goals ADD COLUMN IF NOT EXISTS term TEXT; -- может быть 'короткий срок', 'длинный срок', 'держать во внимании'
ALTER TABLE public.team_goals ADD COLUMN IF NOT EXISTS benefit TEXT; -- может быть 'высокая', 'средняя', 'низкая'

COMMENT ON COLUMN team_goals.priority IS 'Priority level: низкий, средний, высокий';
COMMENT ON COLUMN team_goals.term IS 'Term category: короткий срок, длинный срок, держать во внимании';
COMMENT ON COLUMN team_goals.benefit IS 'Benefit level: высокая, средняя, низкая';

-- 4. How-To Guides Table
CREATE TABLE IF NOT EXISTS how_to_guides (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL UNIQUE,
    content TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE how_to_guides IS 'Instructions and guides for various processes';

-- 5. Licenses Table
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    service_name TEXT NOT NULL UNIQUE,
    description TEXT,
    login TEXT,
    password TEXT,
    notes TEXT
);

COMMENT ON TABLE licenses IS 'Service licenses and credentials';

-- 6. Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE chat_history IS 'History of chat conversations';

-- 7. Generated Cards Table
CREATE TABLE IF NOT EXISTS generated_cards (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_data_hash TEXT NOT NULL UNIQUE,
    file_url TEXT NOT NULL,
    back_file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE generated_cards IS 'Generated card images for users';

-- 8. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT NOT NULL
);

COMMENT ON TABLE profiles IS 'User profiles with additional information';

-- Seed data with fixed user ID
DO $$
DECLARE
    test_user_id UUID := '97a4e1d1-9eb0-49ee-92f1-fdff273ed60b';
    test_user_email TEXT := 'p.koval@autodoc.eu';
BEGIN
    -- Create a profile for this user if it doesn't exist
    INSERT INTO profiles (id, full_name)
    VALUES (test_user_id, 'Pavel Koval')
    ON CONFLICT (id) DO NOTHING;
    
    -- Seed design_resources
    INSERT INTO design_resources (user_id, name, description, link)
    VALUES
        (test_user_id, 'Логотипы компании', 'Коллекция всех официальных логотипов в разных форматах', 'https://storage.company.com/design/logos.zip'),
        (test_user_id, 'Гайдлайн бренда', 'Официальный гайдлайн с правилами использования фирменного стиля', 'https://storage.company.com/design/brand_guidelines.pdf')
    ON CONFLICT (name, link) DO NOTHING;

    -- Seed knowledge_books
    INSERT INTO knowledge_books (user_id, title, author, language, summary, cover_image_url)
    VALUES
        (test_user_id, 'Эффективное управление командой', 'Иванов И.И.', 'Русский', 'Книга о методах эффективного управления командой разработчиков', 'https://storage.company.com/books/team_management.jpg'),
        (test_user_id, 'PostgreSQL: полное руководство', 'Петров П.П.', 'Русский', 'Подробное руководство по использованию PostgreSQL', 'https://storage.company.com/books/postgresql_guide.jpg'),
        (test_user_id, 'Design Patterns in Software Engineering', 'John Smith', 'English', 'Comprehensive guide to software design patterns', 'https://storage.company.com/books/design_patterns.jpg')
    ON CONFLICT (title, author, language) DO NOTHING;

    -- Seed team_goals with new fields
    INSERT INTO team_goals (user_id, title, description, status, due_date, priority, term, benefit)
    VALUES
        (test_user_id, 'Обновить дизайн-систему', 'Привести все компоненты в соответствие с новым брендбуком', 'В процессе', '2023-12-31', 'высокий', 'короткий срок', 'высокая'),
        (test_user_id, 'Провести исследование пользователей', 'Интервью с ключевыми пользователями для выявления болевых точек', 'Запланировано', '2023-11-15', 'средний', 'короткий срок', 'высокая'),
        (test_user_id, 'Разработать стратегию развития продукта', 'Долгосрочный план развития продукта на 2024 год', 'Не начато', '2024-01-31', 'высокий', 'длинный срок', 'высокая'),
        (test_user_id, 'Оптимизировать процесс дизайн-ревью', 'Сократить время на согласование дизайн-решений', 'В процессе', '2023-10-30', 'средний', 'держать во внимании', 'средняя')
    ON CONFLICT (title) DO UPDATE SET
        priority = EXCLUDED.priority,
        term = EXCLUDED.term,
        benefit = EXCLUDED.benefit;

    -- Seed how_to_guides
    INSERT INTO how_to_guides (user_id, title, content, category)
    VALUES
        (test_user_id, 'Настройка рабочего окружения', 'Подробная инструкция по настройке рабочего окружения для разработчиков', 'Техническая документация'),
        (test_user_id, 'Как оформить отпуск', 'Инструкция по процессу оформления отпуска в компании', 'HR')
    ON CONFLICT (title) DO NOTHING;

    -- Seed licenses
    INSERT INTO licenses (user_id, service_name, description, login, password, notes)
    VALUES
        (test_user_id, 'Figma', 'Корпоративная лицензия на Figma', 'company@example.com', 'encrypted_password_1', 'Лицензия действительна до 31.12.2023'),
        (test_user_id, 'Miro', 'Корпоративная лицензия на Miro', 'company@example.com', 'encrypted_password_2', 'Неограниченное количество досок')
    ON CONFLICT (service_name) DO NOTHING;

END $$;

