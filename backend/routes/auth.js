
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { findUserByUsername, findUserWithDepartment } = require('../lib/userLookup');
const { run } = require('../lib/dbUtil');

const router = express.Router();

async function linkUserToDepartmentByName(db, userId, departmentName) {
  if (!departmentName) return;
  const dept = await new Promise((resolve, reject) => {
    db.get('SELECT id, name FROM departments WHERE name = ?', [departmentName], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  if (!dept) return;
  await run(db, 'DELETE FROM user_departments WHERE user_id = ?', [userId]);
  await run(db, 'INSERT OR IGNORE INTO user_departments (user_id, department_id) VALUES (?, ?)', [userId, dept.id]);
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = req.db;

  try {
    const user = await findUserByUsername(db, username);
    if (!user) {
      return res.status(401).json({ error: '账号不存在' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '密码不正确' });
    }

    const profile = await findUserWithDepartment(db, user.id);

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        departmentId: profile?.department_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.department,
        departmentId: profile?.department_id || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/register', authenticateToken, requireManager, async (req, res) => {
  const { username, password, department } = req.body;
  const db = req.db;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      db,
      'INSERT INTO users (username, password, role, department) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, 'employee', department]
    );

    await linkUserToDepartmentByName(db, result.lastID, department);

    res.status(201).json({ message: 'User created successfully', userId: result.lastID });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
