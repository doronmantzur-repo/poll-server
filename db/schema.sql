CREATE TABLE IF NOT EXISTS username (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS polls (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES username(id),
    question TEXT NOT NULL,
    answer_1 TEXT NOT NULL,
    answer_2 TEXT NOT NULL,
    answer_3 TEXT,
    answer_4 TEXT,
    answer_5 TEXT,
    answer_6 TEXT,
    answer_7 TEXT,
    answer_8 TEXT,
    is_public BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_answers (
    id SERIAL PRIMARY KEY,
    poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES username(id),
    answer TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (poll_id, user_id, answer)
);
