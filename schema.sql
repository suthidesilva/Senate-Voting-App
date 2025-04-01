
-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL, 
    password_hash TEXT NOT NULL,
    role_name TEXT NOT NULL CHECK(role_name IN (
        'Senator',
        'President',
        'Vice President',
        'Pro Tempore',
        'Secretary'
    )),
    committee_name TEXT CHECK(committee_name IN (
        'Executive Council',
        'Finance', 
        'Code and Constitution Evaluation', 
        'Campus Life', 
        'Campus Quality and Sustainability', 
        'Community Relations', 
        'Organizations and Outreach'
    )),
    is_admin INTEGER DEFAULT 0,
    is_committee_chair INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    CHECK (is_committee_chair = 0 OR (is_committee_chair = 1 AND committee_name IS NOT NULL))
);

-- Create unique index for committee_name when is_committee_chair is 1
CREATE UNIQUE INDEX unique_committee_chair ON users (committee_name) WHERE is_committee_chair = 1;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER ,
    status TEXT DEFAULT 'ongoing',
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

DROP TRIGGER IF EXISTS check_session_creator;
CREATE TRIGGER check_session_creator
BEFORE INSERT ON sessions
BEGIN
    SELECT RAISE(ABORT, 'Session creator must be Secretary or VicePresident')
    WHERE NOT EXISTS (
        SELECT 1 
        FROM users 
        WHERE user_id = NEW.created_by 
        AND role_name IN ('Secretary', 'VicePresident')
    );
END;

-- DROP TABLE attendance;
-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    session_id INTEGER,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    UNIQUE(session_id, user_id)
);

-- DROP TABLE agendas;
-- Agendas table
CREATE TABLE IF NOT EXISTS agendas (
    agenda_id TEXT PRIMARY KEY,
    session_id INTEGER,
    title TEXT NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);
DROP TRIGGER IF EXISTS check_agenda_creator;
CREATE TRIGGER check_agenda_creator
BEFORE INSERT ON agendas
BEGIN
    SELECT RAISE(ABORT, 'Session creator must be Secretary or VicePresident')
    WHERE NOT EXISTS (
        SELECT 1 
        FROM users 
        WHERE user_id = NEW.created_by 
        AND role_name IN ('Secretary', 'VicePresident')
    );
END;

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    agenda_id INTEGER,
    user_id INTEGER,
    vote TEXT CHECK(vote IN ('yay', 'nay', 'abstain')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agenda_id) REFERENCES agendas(agenda_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE(agenda_id, user_id)
);

CREATE TABLE IF NOT EXISTS agendas_session(
    session_id INTEGER,
    agenda_id TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id),
    FOREIGN KEY (agenda_id) REFERENCES agendas(agenda_id),
    UNIQUE(session_id, agenda_id)
);


SELECT * FROM sessions;
SELECT * FROM attendance;

INSERT INTO users (name, username, password_hash, role_name, committee_name, is_admin, is_active)
VALUES (
    'Senate Secretary',
    'secretary',
    '$2b$10$6vmI3r/ynPnolIwWCO82C.Kl5xVpqBv1/ep7CELl4YXFvGASLN4Ea',
    'Secretary',
    'Executive Council',
    1,
    1
);