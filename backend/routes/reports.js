
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Helper function to call DeepSeek API
async function generateAIContent(prompt) {
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for generating work reports and insights.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API error:', error);
    return 'AI insights temporarily unavailable';
  }
}

// Submit weekly report
router.post('/weekly', authenticateToken, async (req, res) => {
  const { week, month, year, achievements, challenges, next_week_plan } = req.body;
  const db = req.db;

  try {
    // Generate highlights using DeepSeek
    const prompt = `Based on these weekly achievements: ${achievements}, and challenges: ${challenges}, generate 3-5 concise work highlights.`;
    const highlights = await generateAIContent(prompt);

    db.run(
      'INSERT INTO weekly_reports (user_id, week, month, year, achievements, challenges, next_week_plan, highlights) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.userId, week, month, year, achievements, challenges, next_week_plan, highlights],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ id: this.lastID, highlights, message: 'Weekly report submitted successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error generating AI insights' });
  }
});

// Update weekly report
router.put('/weekly/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { summary } = req.body;
  const db = req.db;

  db.run(
    'UPDATE weekly_reports SET summary = ? WHERE id = ? AND user_id = ?',
    [summary, id, req.user.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }
      res.json({ message: 'Weekly report updated successfully' });
    }
  );
});

// Get weekly reports
router.get('/weekly', authenticateToken, (req, res) => {
  const db = req.db;
  const userId = req.user.role === 'manager' ? req.query.userId : req.user.userId;

  db.all(
    'SELECT * FROM weekly_reports WHERE user_id = ? ORDER BY year DESC, month DESC, week DESC',
    [userId || req.user.userId],
    (err, reports) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(reports);
    }
  );
});

// Generate monthly report
router.post('/monthly/generate', authenticateToken, async (req, res) => {
  const { month, year } = req.body;
  const db = req.db;

  try {
    // Get all weekly reports for the month
    db.all(
      'SELECT * FROM weekly_reports WHERE user_id = ? AND month = ? AND year = ?',
      [req.user.userId, month, year],
      async (err, weeklyReports) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (weeklyReports.length === 0) {
          return res.status(400).json({ error: 'No weekly reports found for this month' });
        }

        // Combine weekly reports
        const allAchievements = weeklyReports.map(r => r.achievements).join('\n');
        const allChallenges = weeklyReports.map(r => r.challenges).join('\n');
        const nextMonthPlan = weeklyReports[weeklyReports.length - 1]?.next_week_plan || '';

        // Generate AI summary
        const prompt = `Based on these monthly achievements: ${allAchievements}, and challenges: ${allChallenges}, generate a concise monthly summary and 3-5 key highlights.`;
        const aiResponse = await generateAIContent(prompt);
        
        // 解析AI响应，分离总结和亮点
        const summary = aiResponse;
        const highlights = aiResponse.includes('Highlights:') ? 
          aiResponse.split('Highlights:')[1]?.trim() : 
          aiResponse;

        // Check if monthly report already exists
        db.get(
          'SELECT id FROM monthly_reports WHERE user_id = ? AND month = ? AND year = ?',
          [req.user.userId, month, year],
          (err, existing) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            if (existing) {
              // Update existing report
              db.run(
                'UPDATE monthly_reports SET summary = ?, highlights = ? WHERE id = ?',
                [summary, highlights, existing.id],
                function(err) {
                  if (err) {
                    return res.status(500).json({ error: 'Database error' });
                  }
                  res.json({ id: existing.id, summary, highlights, message: 'Monthly report updated successfully' });
                }
              );
            } else {
              // Create new report
              db.run(
                'INSERT INTO monthly_reports (user_id, month, year, summary, highlights) VALUES (?, ?, ?, ?, ?)',
                [req.user.userId, month, year, summary, highlights],
                function(err) {
                  if (err) {
                    return res.status(500).json({ error: 'Database error' });
                  }
                  res.status(201).json({ id: this.lastID, summary, highlights, message: 'Monthly report generated successfully' });
                }
              );
            }
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error generating monthly report' });
  }
});

// Get monthly reports
router.get('/monthly', authenticateToken, (req, res) => {
  const db = req.db;
  const userId = req.user.role === 'manager' ? req.query.userId : req.user.userId;

  db.all(
    'SELECT * FROM monthly_reports WHERE user_id = ? ORDER BY year DESC, month DESC',
    [userId || req.user.userId],
    (err, reports) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(reports);
    }
  );
});

// Generate annual report
router.post('/annual/generate', authenticateToken, async (req, res) => {
  const { year } = req.body;
  const db = req.db;

  try {
    // Get all monthly reports for the year
    db.all(
      'SELECT * FROM monthly_reports WHERE user_id = ? AND year = ?',
      [req.user.userId, year],
      async (err, monthlyReports) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (monthlyReports.length === 0) {
          return res.status(400).json({ error: 'No monthly reports found for this year' });
        }

        // Combine monthly reports
        const allAchievements = monthlyReports.map(r => r.summary).join('\n');
        const allChallenges = monthlyReports.map(r => r.challenges || '').join('\n');
        const allHighlights = monthlyReports.map(r => r.highlights || '').join('\n');

        // Generate AI annual summary
        const prompt = `Based on this year's achievements: ${allAchievements}, challenges: ${allChallenges}, and highlights: ${allHighlights}, generate a comprehensive annual summary with key accomplishments and insights.`;
        const annualSummary = await generateAIContent(prompt);

        res.json({ 
          summary: annualSummary,
          achievements: allAchievements,
          challenges: allChallenges,
          highlights: allHighlights,
          message: 'Annual report generated successfully'
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error generating annual report' });
  }
});

// Generate weekly report from plan
router.post('/weekly/from-plan', authenticateToken, async (req, res) => {
  const { planId, week, month, year, achievements, challenges, next_week_plan } = req.body;
  const db = req.db;

  try {
    // Generate highlights using DeepSeek
    const prompt = `Based on these weekly achievements: ${achievements}, and challenges: ${challenges}, generate 3-5 concise work highlights.`;
    const highlights = await generateAIContent(prompt);

    db.run(
      'INSERT INTO weekly_reports (user_id, week, month, year, achievements, challenges, next_week_plan, highlights) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.userId, week, month, year, achievements, challenges, next_week_plan, highlights],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Update plan status to completed
        db.run(
          'UPDATE weekly_plans SET status = ? WHERE id = ? AND user_id = ?',
          ['completed', planId, req.user.userId],
          function(updateErr) {
            if (updateErr) {
              console.error('Failed to update plan status:', updateErr);
            }
          }
        );
        
        res.status(201).json({ id: this.lastID, highlights, message: 'Weekly report submitted successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error generating AI insights' });
  }
});

// Get AI work suggestions
router.post('/ai-suggestions', authenticateToken, async (req, res) => {
  const { workType, currentProgress, challenges } = req.body;

  try {
    const prompt = `For ${workType} work with current progress: ${currentProgress}, and challenges: ${challenges}, provide 3-5 specific, actionable next steps and suggestions.`;
    const suggestions = await generateAIContent(prompt);

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Error generating AI suggestions' });
  }
});

module.exports = router;
