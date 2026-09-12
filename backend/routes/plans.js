
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Create annual plan
router.post('/annual', authenticateToken, (req, res) => {
  const { title, description, objectives, year } = req.body;
  const db = req.db;

  db.run(
    'INSERT INTO annual_plans (user_id, year, title, description, objectives) VALUES (?, ?, ?, ?, ?)',
    [req.user.userId, year, title, description, objectives],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, message: 'Annual plan created successfully' });
    }
  );
});

// Get annual plans
router.get('/annual', authenticateToken, (req, res) => {
  const db = req.db;
  const userId = req.user.role === 'manager' ? req.query.userId : req.user.userId;

  db.all(
    'SELECT * FROM annual_plans WHERE user_id = ? ORDER BY year DESC',
    [userId || req.user.userId],
    (err, plans) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(plans);
    }
  );
});

// Create monthly plan
router.post('/monthly', authenticateToken, (req, res) => {
  const { month, year, title, description, objectives, tasks } = req.body;
  const db = req.db;

  // 暂时不插入tasks字段，先让月度计划创建成功
   const tasksJson = tasks ? JSON.stringify(tasks) : null;

  db.run(
    // [修复] 在 INSERT 语句中添加 tasks 字段
    'INSERT INTO monthly_plans (user_id, month, year, title, description, objectives, annual_plan_id, tasks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    // [修复] 添加 tasksJson 到参数列表
    [req.user.userId, month, year, title, description, objectives, req.body.annual_plan_id || null, tasksJson],
    function(err) {
      if (err) {
        console.error('月度计划插入数据库错误:', err)
        console.error('SQL错误详情:', err.message)
        return res.status(500).json({ error: 'Database error' });
      }
      console.log('月度计划创建成功，ID:', this.lastID)
      res.status(201).json({ id: this.lastID, message: 'Monthly plan created successfully' });
    }
  );
});

// Get monthly plans
router.get('/monthly', authenticateToken, (req, res) => {
  const db = req.db;
  const userId = req.user.role === 'manager' ? req.query.userId : req.user.userId;

  db.all(
    'SELECT * FROM monthly_plans WHERE user_id = ? ORDER BY year DESC, month DESC',
    [userId || req.user.userId],
    (err, plans) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // 解析tasks JSON字符串
      const plansWithTasks = plans.map(plan => {
        if (plan.tasks) {
          try {
            plan.tasks = JSON.parse(plan.tasks);
          } catch (error) {
            console.error('解析tasks JSON失败:', error);
            plan.tasks = [];
          }
        } else {
          plan.tasks = [];
        }
        return plan;
      });
      
      res.json(plansWithTasks);
    }
  );
});

// Create weekly plan
router.post('/weekly', authenticateToken, (req, res) => {
  const { week, month, year, title, description, objectives } = req.body;
  const db = req.db;

  db.run(
    'INSERT INTO weekly_plans (user_id, week, month, year, title, description, objectives) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.userId, week, month, year, title, description, objectives],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, message: 'Weekly plan created successfully' });
    }
  );
});

// Get weekly plans
router.get('/weekly', authenticateToken, (req, res) => {
  const db = req.db;
  const userId = req.user.role === 'manager' ? req.query.userId : req.user.userId;

  db.all(
    'SELECT * FROM weekly_plans WHERE user_id = ? ORDER BY year DESC, month DESC, week DESC',
    [userId || req.user.userId],
    (err, plans) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(plans);
    }
  );
});

// Update plan
router.put('/:type/:id', authenticateToken, (req, res) => {
  const { type, id } = req.params;
  const { title, description, objectives, year, month, week, tasks } = req.body;
  const db = req.db;
  
  const tableMap = {
    'annual': 'annual_plans',
    'monthly': 'monthly_plans',
    'weekly': 'weekly_plans'
  };
  
  const table = tableMap[type];
  if (!table) {
    return res.status(400).json({ error: 'Invalid plan type' });
  }

  let updateFields = [];
  let values = [];
  
  if (title) {
    updateFields.push('title = ?');
    values.push(title);
  }
  if (description) {
    updateFields.push('description = ?');
    values.push(description);
  }
  if (objectives) {
    updateFields.push('objectives = ?');
    values.push(objectives);
  }
  if (year) {
    updateFields.push('year = ?');
    values.push(year);
  }
  if (month) {
    updateFields.push('month = ?');
    values.push(month);
  }
  if (week) {
    updateFields.push('week = ?');
    values.push(week);
  }
  if (tasks !== undefined) {
    // 将tasks数组转换为JSON字符串存储
    const tasksJson = tasks ? JSON.stringify(tasks) : null;
    updateFields.push('tasks = ?');
    values.push(tasksJson);
  }
  
  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  
  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  values.push(id, req.user.userId);
  
  db.run(
    `UPDATE ${table} SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      res.json({ message: 'Plan updated successfully' });
    }
  );
});

// Delete plan
router.delete('/:type/:id', authenticateToken, (req, res) => {
  const { type, id } = req.params;
  const db = req.db;
  
  const tableMap = {
    'annual': 'annual_plans',
    'monthly': 'monthly_plans',
    'weekly': 'weekly_plans'
  };
  
  const table = tableMap[type];
  if (!table) {
    return res.status(400).json({ error: 'Invalid plan type' });
  }

  db.run(
    `DELETE FROM ${table} WHERE id = ? AND user_id = ?`,
    [id, req.user.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      res.json({ message: 'Plan deleted successfully' });
    }
  );
});

// Update plan status
router.put('/:type/:id/status', authenticateToken, (req, res) => {
  const { type, id } = req.params;
  const { status } = req.body;
  const db = req.db;
  
  const tableMap = {
    'annual': 'annual_plans',
    'monthly': 'monthly_plans',
    'weekly': 'weekly_plans'
  };
  
  const table = tableMap[type];
  if (!table) {
    return res.status(400).json({ error: 'Invalid plan type' });
  }

  db.run(
    `UPDATE ${table} SET status = ? WHERE id = ? AND user_id = ?`,
    [status, id, req.user.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      res.json({ message: 'Plan status updated successfully' });
    }
  );
});

module.exports = router;
