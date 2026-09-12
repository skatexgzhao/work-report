
const express = require('express');
const router = express.Router();
const { authenticateToken, requireManager } = require('../middleware/auth');

// Get all users (manager only)
router.get('/', authenticateToken, requireManager, (req, res) => {
  const db = req.db;

  db.all(
    'SELECT id, username, role, department, created_at FROM users ORDER BY created_at DESC',
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(users);
    }
  );
});

// Get user progress summary (manager only)
router.get('/progress/:userId', authenticateToken, requireManager, (req, res) => {
  const { userId } = req.params;
  const db = req.db;

  const progressQuery = `
    SELECT 
      'annual' as type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM annual_plans WHERE user_id = ?
    UNION ALL
    SELECT 
      'monthly' as type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM monthly_plans WHERE user_id = ?
    UNION ALL
    SELECT 
      'weekly' as type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM weekly_plans WHERE user_id = ?
  `;

  db.all(progressQuery, [userId, userId, userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const progress = {
      annual: results.find(r => r.type === 'annual') || { total: 0, completed: 0, in_progress: 0, pending: 0 },
      monthly: results.find(r => r.type === 'monthly') || { total: 0, completed: 0, in_progress: 0, pending: 0 },
      weekly: results.find(r => r.type === 'weekly') || { total: 0, completed: 0, in_progress: 0, pending: 0 }
    };

    res.json(progress);
  });
});

// Get lagging users (manager only)
router.get('/lagging', authenticateToken, requireManager, (req, res) => {
  const db = req.db;

  const laggingQuery = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.department,
      COUNT(CASE WHEN wp.status = 'pending' THEN 1 END) as pending_weekly,
      COUNT(CASE WHEN mp.status = 'pending' THEN 1 END) as pending_monthly,
      COUNT(CASE WHEN ap.status = 'pending' THEN 1 END) as pending_annual
    FROM users u
    LEFT JOIN weekly_plans wp ON u.id = wp.user_id
    LEFT JOIN monthly_plans mp ON u.id = mp.user_id
    LEFT JOIN annual_plans ap ON u.id = ap.user_id
    WHERE u.role = 'employee'
    GROUP BY u.id
    HAVING pending_weekly > 0 OR pending_monthly > 0 OR pending_annual > 0
    ORDER BY (pending_weekly + pending_monthly + pending_annual) DESC
  `;

  db.all(laggingQuery, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

// Delete user (manager only)
router.delete('/:id', authenticateToken, requireManager, (req, res) => {
  const { id } = req.params;
  const db = req.db;

  // 不能删除自己
  if (parseInt(id) === req.user.userId) {
    return res.status(400).json({ error: '不能删除自己的账户' });
  }

  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

// Update user password
router.put('/password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = req.db;
  const bcrypt = require('bcryptjs');

  db.get('SELECT password FROM users WHERE id = ?', [req.user.userId], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    db.run(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.userId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Password updated successfully' });
      }
    );
  });
});

module.exports = router;
