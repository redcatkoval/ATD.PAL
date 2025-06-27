-- Создание таблицы для хранения состояния диалога
CREATE TABLE IF NOT EXISTS dialog_state (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS dialog_state_user_id_idx ON dialog_state(user_id);

-- Комментарии к таблице
COMMENT ON TABLE dialog_state IS 'Хранит текущее состояние диалога для каждого пользователя';
COMMENT ON COLUMN dialog_state.user_id IS 'ID пользователя';
COMMENT ON COLUMN dialog_state.status IS 'Текущий статус диалога (например, waiting_for_card_name)';
COMMENT ON COLUMN dialog_state.context IS 'Контекст диалога в формате JSON для хранения дополнительных данных';
COMMENT ON COLUMN dialog_state.created_at IS 'Время создания записи';
COMMENT ON COLUMN dialog_state.updated_at IS 'Время последнего обновления записи'; 