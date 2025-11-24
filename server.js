const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        const defaultUsers = [
            { username: 'operator1', password: 'op123', role: 'operator' },
            { username: 'tech1', password: 'tech123', role: 'technician' },
            { username: 'admin1', password: 'admin123', role: 'admin' }
        ];
        fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        return defaultUsers;
    }
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (err) {
        console.error('Failed to parse users.json:', err);
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadSessions() {
    if (!fs.existsSync(SESSIONS_FILE)) {
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2));
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    } catch (err) {
        console.error('Failed to parse sessions.json:', err);
        return {};
    }
}

function saveSessions(sessions) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function genToken() {
    return crypto.randomBytes(32).toString('hex');
}

app.use(cors());
app.use(bodyParser.json());

app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;
    const users = loadUsers();
    let sessions = loadSessions();
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing credentials.' });
    }
    const user = users.find(u => u.username === username && u.password === password && u.role === role);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }
    for (let token in sessions) {
        if (sessions[token].username === username && sessions[token].role === role) {
            return res.json({ message: 'Login successful.', username, role, token });
        }
    }
    const token = genToken();
    sessions[token] = { username, role };
    saveSessions(sessions);
    res.json({
        message: 'Login successful.',
        username, role, token
    });
});

function requireAdmin(req, res, next) {
    const token = req.headers['authorization'];
    const sessions = loadSessions();
    if (!token || !sessions[token] || sessions[token].role !== 'admin') {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    req.session = sessions[token];
    next();
}

app.get('/api/users', requireAdmin, (req, res) => {
    const users = loadUsers();
    res.json(users);
});

app.post('/api/users', requireAdmin, (req, res) => {
    const users = loadUsers();
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing fields for new user.' });
    }
    if (users.find(u => u.username === username)) {
        return res.status(409).json({ error: 'User already exists.' });
    }
    users.push({ username, password, role });
    saveUsers(users);
    res.json({ message: 'User added.', users });
});

app.put('/api/users/:username', requireAdmin, (req, res) => {
    const users = loadUsers();
    const { username } = req.params;
    const { password, role } = req.body;
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    if (password) user.password = password;
    if (role) user.role = role;
    saveUsers(users);
    res.json({ message: 'User updated.', user });
});

app.delete('/api/users/:username', requireAdmin, (req, res) => {
    let users = loadUsers();
    const { username } = req.params;
    const idx = users.findIndex(u => u.username === username);
    if (idx < 0) {
        return res.status(404).json({ error: 'User not found.' });
    }
    users.splice(idx, 1);
    saveUsers(users);
    res.json({ message: 'User deleted.', users });
});

app.post('/api/logout', (req, res) => {
    const token = req.headers['authorization'];
    let sessions = loadSessions();
    if (token && sessions[token]) {
        delete sessions[token];
        saveSessions(sessions);
    }
    res.json({ message: 'Logged out.' });
});

app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});
