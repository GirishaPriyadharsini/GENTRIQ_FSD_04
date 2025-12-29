require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'productivity_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Validation middleware
const validateRegister = [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Check database connection
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

// Routes
// Register
app.post('/api/register', validateRegister, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, email, password } = req.body;
        
        // Check if user exists
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        const defaultCategories = [
            ['Personal', '#007bff'],
            ['Work', '#8c00ff'],
            ['Study', '#00ff4c'],
            ['Important', '#ff0000'],
            ['Finance', '#225d29'],
            ['Travel', '#00ccff'],
            ['Others', '#ff00f7']
        ];
        
        for (const [name, color] of defaultCategories) {
            await pool.execute(
                'INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)',
                [result.insertId, name, color]
            );
        }
        
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
app.post('/api/login', validateLogin, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all user data
app.get('/api/user-data', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get all data in parallel for better performance
        const [notes] = await pool.execute(
            `SELECT n.*, c.name as category_name, c.color as category_color 
             FROM notes n 
             LEFT JOIN categories c ON n.category_id = c.id 
             WHERE n.user_id = ? 
             ORDER BY n.is_pinned DESC, n.updated_at DESC`,
            [userId]
        );
        
        const [todos] = await pool.execute(
            `SELECT t.*, c.name as category_name, c.color as category_color 
             FROM todos t 
             LEFT JOIN categories c ON t.category_id = c.id 
             WHERE t.user_id = ? 
             ORDER BY t.priority DESC, t.due_date`,
            [userId]
        );
        
        const [reminders] = await pool.execute(
            `SELECT r.*, c.name as category_name, c.color as category_color 
             FROM reminders r 
             LEFT JOIN categories c ON r.category_id = c.id 
             WHERE r.user_id = ? 
             ORDER BY r.reminder_time`,
            [userId]
        );
        
        const [categories] = await pool.execute(
            'SELECT * FROM categories WHERE user_id = ? ORDER BY name',
            [userId]
        );
        
        res.json({
            notes,
            todos,
            reminders,
            categories
        });
        
    } catch (error) {
        console.error('User data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Categories CRUD
app.get('/api/categories', authenticateToken, async (req, res) => {
    try {
        const [categories] = await pool.execute(
            'SELECT * FROM categories WHERE user_id = ? ORDER BY name',
            [req.user.id]
        );
        res.json(categories);
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
    try {
        const { name, color } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Category name is required' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)',
            [req.user.id, name.trim(), color || '#007bff']
        );
        
        const [newCategory] = await pool.execute(
            'SELECT * FROM categories WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(newCategory[0]);
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
    try {
        const { name, color } = req.body;
        const categoryId = req.params.id;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Category name is required' });
        }
        
        await pool.execute(
            'UPDATE categories SET name = ?, color = ? WHERE id = ? AND user_id = ?',
            [name.trim(), color || '#007bff', categoryId, req.user.id]
        );
        
        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
    try {
        const categoryId = req.params.id;
        await pool.execute(
            'UPDATE notes SET category_id = NULL WHERE category_id = ? AND user_id = ?',
            [categoryId, req.user.id]
        );
        
        await pool.execute(
            'UPDATE todos SET category_id = NULL WHERE category_id = ? AND user_id = ?',
            [categoryId, req.user.id]
        );
        
        await pool.execute(
            'UPDATE reminders SET category_id = NULL WHERE category_id = ? AND user_id = ?',
            [categoryId, req.user.id]
        );
        
        // Now delete the category
        await pool.execute(
            'DELETE FROM categories WHERE id = ? AND user_id = ?',
            [categoryId, req.user.id]
        );
        
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Notes CRUD
app.post('/api/notes', authenticateToken, async (req, res) => {
    try {
        const { title, content, category_id, is_pinned } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Note title is required' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO notes (user_id, title, content, category_id, is_pinned) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, title.trim(), content || '', category_id || null, is_pinned ? 1 : 0]
        );
        
        const [newNote] = await pool.execute(
            `SELECT n.*, c.name as category_name, c.color as category_color 
             FROM notes n 
             LEFT JOIN categories c ON n.category_id = c.id 
             WHERE n.id = ?`,
            [result.insertId]
        );
        
        res.status(201).json(newNote[0]);
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        const { title, content, category_id, is_pinned } = req.body;
        const noteId = req.params.id;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Note title is required' });
        }
        
        await pool.execute(
            `UPDATE notes 
             SET title = ?, content = ?, category_id = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [title.trim(), content || '', category_id || null, is_pinned ? 1 : 0, noteId, req.user.id]
        );
        
        const [updatedNote] = await pool.execute(
            `SELECT n.*, c.name as category_name, c.color as category_color 
             FROM notes n 
             LEFT JOIN categories c ON n.category_id = c.id 
             WHERE n.id = ?`,
            [noteId]
        );
        
        res.json(updatedNote[0]);
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
    try {
        await pool.execute(
            'DELETE FROM notes WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/notes/:id/pin', authenticateToken, async (req, res) => {
    try {
        const { pinned } = req.body;
        await pool.execute(
            'UPDATE notes SET is_pinned = ? WHERE id = ? AND user_id = ?',
            [pinned ? 1 : 0, req.params.id, req.user.id]
        );
        res.json({ message: 'Pin status updated' });
    } catch (error) {
        console.error('Pin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Todos CRUD
app.post('/api/todos', authenticateToken, async (req, res) => {
    try {
        const { task, category_id, priority, due_date } = req.body;
        
        if (!task || task.trim() === '') {
            return res.status(400).json({ error: 'Task description is required' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO todos (user_id, task, category_id, priority, due_date) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, task.trim(), category_id || null, priority || 'medium', due_date || null]
        );
        
        const [newTodo] = await pool.execute(
            `SELECT t.*, c.name as category_name, c.color as category_color 
             FROM todos t 
             LEFT JOIN categories c ON t.category_id = c.id 
             WHERE t.id = ?`,
            [result.insertId]
        );
        
        res.status(201).json(newTodo[0]);
    } catch (error) {
        console.error('Create todo error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/todos/:id', authenticateToken, async (req, res) => {
    try {
        const { task, is_completed, category_id, priority, due_date } = req.body;
        const todoId = req.params.id;
        
        if (!task || task.trim() === '') {
            return res.status(400).json({ error: 'Task description is required' });
        }
        
        await pool.execute(
            `UPDATE todos 
             SET task = ?, is_completed = ?, category_id = ?, priority = ?, due_date = ? 
             WHERE id = ? AND user_id = ?`,
            [task.trim(), is_completed ? 1 : 0, category_id || null, priority || 'medium', 
             due_date || null, todoId, req.user.id]
        );
        
        const [updatedTodo] = await pool.execute(
            `SELECT t.*, c.name as category_name, c.color as category_color 
             FROM todos t 
             LEFT JOIN categories c ON t.category_id = c.id 
             WHERE t.id = ?`,
            [todoId]
        );
        
        res.json(updatedTodo[0]);
    } catch (error) {
        console.error('Update todo error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/todos/:id', authenticateToken, async (req, res) => {
    try {
        await pool.execute(
            'DELETE FROM todos WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Todo deleted successfully' });
    } catch (error) {
        console.error('Delete todo error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reminders CRUD
app.post('/api/reminders', authenticateToken, async (req, res) => {
    try {
        const { title, description, category_id, reminder_time } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Reminder title is required' });
        }
        
        if (!reminder_time) {
            return res.status(400).json({ error: 'Reminder time is required' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO reminders (user_id, title, description, category_id, reminder_time) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, title.trim(), description || '', category_id || null, reminder_time]
        );
        
        const [newReminder] = await pool.execute(
            `SELECT r.*, c.name as category_name, c.color as category_color 
             FROM reminders r 
             LEFT JOIN categories c ON r.category_id = c.id 
             WHERE r.id = ?`,
            [result.insertId]
        );
        
        res.status(201).json(newReminder[0]);
    } catch (error) {
        console.error('Create reminder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/reminders/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description, category_id, reminder_time, is_completed } = req.body;
        const reminderId = req.params.id;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Reminder title is required' });
        }
        
        if (!reminder_time) {
            return res.status(400).json({ error: 'Reminder time is required' });
        }
        
        await pool.execute(
            `UPDATE reminders 
             SET title = ?, description = ?, category_id = ?, reminder_time = ?, is_completed = ? 
             WHERE id = ? AND user_id = ?`,
            [title.trim(), description || '', category_id || null, reminder_time, 
             is_completed ? 1 : 0, reminderId, req.user.id]
        );
        
        const [updatedReminder] = await pool.execute(
            `SELECT r.*, c.name as category_name, c.color as category_color 
             FROM reminders r 
             LEFT JOIN categories c ON r.category_id = c.id 
             WHERE r.id = ?`,
            [reminderId]
        );
        
        res.json(updatedReminder[0]);
    } catch (error) {
        console.error('Update reminder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/reminders/:id', authenticateToken, async (req, res) => {
    try {
        await pool.execute(
            'DELETE FROM reminders WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Reminder deleted successfully' });
    } catch (error) {
        console.error('Delete reminder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get upcoming reminders (for dashboard)
app.get('/api/upcoming-reminders', authenticateToken, async (req, res) => {
    try {
        const [reminders] = await pool.execute(
            `SELECT r.*, c.name as category_name, c.color as category_color 
             FROM reminders r 
             LEFT JOIN categories c ON r.category_id = c.id 
             WHERE r.user_id = ? 
             AND r.is_completed = 0 
             AND r.reminder_time >= NOW() 
             ORDER BY r.reminder_time 
             LIMIT 10`,
            [req.user.id]
        );
        res.json(reminders);
    } catch (error) {
        console.error('Upcoming reminders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Complete todo/reminder
app.put('/api/complete/:type/:id', authenticateToken, async (req, res) => {
    try {
        const { type, id } = req.params;
        const { completed } = req.body;
        
        if (type === 'todo') {
            await pool.execute(
                'UPDATE todos SET is_completed = ? WHERE id = ? AND user_id = ?',
                [completed ? 1 : 0, id, req.user.id]
            );
        } else if (type === 'reminder') {
            await pool.execute(
                'UPDATE reminders SET is_completed = ? WHERE id = ? AND user_id = ?',
                [completed ? 1 : 0, id, req.user.id]
            );
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }
        
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Complete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get today's tasks
app.get('/api/today-tasks', authenticateToken, async (req, res) => {
    try {
        const [tasks] = await pool.execute(
            `SELECT t.*, c.name as category_name, c.color as category_color 
             FROM todos t 
             LEFT JOIN categories c ON t.category_id = c.id 
             WHERE t.user_id = ? 
             AND t.due_date = CURDATE() 
             ORDER BY t.priority DESC, t.created_at`,
            [req.user.id]
        );
        res.json(tasks);
    } catch (error) {
        console.error('Today tasks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

});
