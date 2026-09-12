
const express = require('express')
const axios = require('axios')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')

// Helper function to call DeepSeek API with better error handling
async function generateAIContent(prompt, maxRetries = 3, maxTokens = 4000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI API调用尝试 ${attempt}/${maxRetries}, maxTokens: ${maxTokens}`)
      console.log('API密钥前几位:', process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.substring(0, 10) + '...' : '未设置')
      
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: '你是一个专业的项目管理专家。请严格按照指定的JSON格式返回数据，确保格式正确且完整。如果无法生成完整数据，请返回一个合理的默认结构。' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3, // 降低随机性，提高一致性
        response_format: { type: "json_object" } // 强制JSON格式
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60秒超时，支持长文本生成
      })
      
      const content = response.data.choices[0].message.content
      console.log('AI响应长度:', content.length)
      console.log('AI响应内容前200字符:', content.substring(0, 200))
      
      return content
      
    } catch (error) {
      lastError = error
      console.error(`AI API调用失败 (尝试 ${attempt}/${maxRetries}):`, error.response?.data || error.message)
      
      if (error.response?.status === 429) {
        // 频率限制，等待后重试
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000) // 指数退避，最多10秒
        console.log(`频率限制，等待 ${waitTime}ms 后重试`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      if (error.response?.status === 401) {
        throw new Error('API密钥无效或未配置')
      }
      
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        // 网络问题，等待后重试
        const waitTime = 2000 * attempt
        console.log(`网络问题，等待 ${waitTime}ms 后重试`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // 其他错误直接抛出
      throw new Error(`AI服务暂时不可用: ${error.message}`)
    }
  }
  
  throw lastError || new Error('AI服务调用失败')
}

// AI 年度计划分解
router.post('/annual-breakdown', authenticateToken, async (req, res) => {
  try {
    const { goal, keyMetrics, year } = req.body
    
    console.log('收到年度计划分解请求:', { goal, keyMetrics, year })
    
    if (!goal) {
      return res.status(400).json({ error: '请提供工作目标' })
    }
    
    const systemPrompt = `你是一个项目管理专家。请根据年度目标生成结构化工作计划。

要求：
1. 生成12个月的月度计划
2. 每月3-5个任务，包含优先级和工时
3. 每月2-3个关键指标

返回JSON格式：
{
  "annualPlan": {
    "title": "计划标题",
    "objective": "年度目标描述",
    "strategies": ["措施1", "措施2"],
    "expectedOutcomes": ["成果1", "成果2"]
  },
  "monthlyPlans": [
    {
      "month": "2026-01",
      "title": "1月主题",
      "tasks": [
        {
          "title": "任务标题",
          "description": "任务描述",
          "priority": "high",
          "estimatedHours": 40
        }
      ],
      "keyMetrics": ["指标1", "指标2"]
    }
  ]
}`

    const userPrompt = `目标：${goal}
指标：${keyMetrics || '未指定'}
年份：${year || new Date().getFullYear()}

请生成12个月工作计划。`

    const aiResponse = await generateAIContent(systemPrompt + '\n\n用户输入：\n' + userPrompt, 3, 8000)
    
    // 解析 AI 响应为JSON
    let annualPlan
    try {
      annualPlan = JSON.parse(aiResponse)
      console.log('JSON解析成功，月度计划数量:', annualPlan.monthlyPlans?.length || 0)
    } catch (error) {
      console.log('JSON解析失败，尝试修复格式:', error.message)
      try {
        const fixedResponse = fixJSONFormat(aiResponse)
        annualPlan = JSON.parse(fixedResponse)
        console.log('修复JSON格式成功，月度计划数量:', annualPlan.monthlyPlans?.length || 0)
      } catch (secondError) {
        console.log('修复JSON格式失败，使用默认计划:', secondError.message)
        annualPlan = createDefaultAnnualPlan(goal, keyMetrics, year)
      }
    }
    
    // 验证数据结构完整性
    if (!annualPlan.annualPlan || !annualPlan.monthlyPlans) {
      console.log('AI返回数据结构不完整，使用默认计划')
      annualPlan = createDefaultAnnualPlan(goal, keyMetrics, year)
    }
    
    // 确保有12个月的计划
    if (annualPlan.monthlyPlans.length < 12) {
      console.log(`AI只返回了${annualPlan.monthlyPlans.length}个月计划，补充到12个月`)
      annualPlan = createDefaultAnnualPlan(goal, keyMetrics, year)
    }
    
    res.json(annualPlan)
    
  } catch (error) {
    console.error('AI 年度计划分解错误:', error)
    console.error('错误详情:', error.response?.data || error.message)
    console.error('错误状态:', error.response?.status)
    console.error('错误代码:', error.code)
    
    // 提供更友好的错误信息
    let errorMessage = 'AI服务暂时不可用'
    
    if (error.message.includes('API密钥无效') || error.message.includes('401')) {
      errorMessage = 'AI服务配置错误，请联系管理员'
    } else if (error.message.includes('网络连接失败') || error.message.includes('ENOTFOUND')) {
      errorMessage = '网络连接失败，请检查网络连接'
    } else if (error.message.includes('频率限制') || error.message.includes('429')) {
      errorMessage = 'AI服务使用频率过高，请稍后重试'
    } else if (error.response?.status === 500) {
      errorMessage = 'AI服务内部错误，请稍后重试'
    }
    
    // 返回错误信息和默认计划 - 使用req.body中的参数
    const defaultPlan = createDefaultAnnualPlan(req.body.goal, req.body.keyMetrics, req.body.year)
    defaultPlan.aiError = errorMessage
    
    res.json(defaultPlan)
  }
})

// AI 月度计划分解
router.post('/monthly-breakdown', authenticateToken, async (req, res) => {
  try {
    const { prompt, timeframe, monthlyPlanId } = req.body
    
    if (!prompt) {
      return res.status(400).json({ error: '请提供工作目标' })
    }
    
    const startDate = new Date(timeframe[0] + '-01')
    const endDate = new Date(timeframe[1] + '-01')
    
    // 计算月份数量
    const months = []
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      months.push({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        monthStr: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      })
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
    
    const systemPrompt = `你是一个专业的项目管理专家。请根据提供的目标，生成详细的月度工作计划分解。

重要要求：
1. 为指定的时间范围内的每个月生成具体的工作计划
2. 每个月的计划包含4周的详细任务安排
3. 每个任务要有明确的优先级（high/medium/low）和合理的预计工时
4. 每个月度计划要有2-3个可量化的关键指标

请严格按照以下JSON格式返回，确保格式完全正确：

{
  "monthlyPlans": [
    {
      "month": "2024-01",
      "mainObjective": "本月主要目标",
      "tasks": [
        {
          "week": 1,
          "title": "任务标题",
          "description": "任务详细描述",
          "priority": "high",
          "estimatedHours": 8
        }
      ],
      "metrics": [
        {
          "name": "指标名称",
          "target": "具体数值"
        }
      ]
    }
  ]
}

注意：必须为时间范围内的每个月生成完整数据，月份格式为"2026-01"。`

    const aiResponse = await generateAIContent(systemPrompt + '\n\n' + prompt, 3, 3000)
    
    // 解析 AI 响应
    let monthlyPlan
    try {
      monthlyPlan = JSON.parse(aiResponse)
    } catch (error) {
      console.log('月度计划JSON解析失败，尝试修复格式:', error.message)
      try {
        const fixedResponse = fixJSONFormat(aiResponse)
        monthlyPlan = JSON.parse(fixedResponse)
      } catch (secondError) {
        console.log('修复JSON格式失败，尝试提取JSON对象:', secondError.message)
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const extractedJson = fixJSONFormat(jsonMatch[0])
            monthlyPlan = JSON.parse(extractedJson)
          } else {
            throw new Error('无法从AI响应中提取有效的JSON')
          }
        } catch (finalError) {
          console.log('所有JSON解析尝试都失败，使用默认计划:', finalError.message)
          monthlyPlan = createDefaultMonthlyPlan(months, prompt)
        }
      }
    }
    
    // 验证数据结构
    if (!monthlyPlan.monthlyPlans || !Array.isArray(monthlyPlan.monthlyPlans)) {
      monthlyPlan = createDefaultMonthlyPlan(months, prompt)
    }
    
    res.json(monthlyPlan)
    
  } catch (error) {
    console.error('AI 月度计划分解错误:', error)
    
    // 提供更友好的错误信息
    let errorMessage = 'AI服务暂时不可用'
    
    if (error.message.includes('API密钥无效') || error.message.includes('401')) {
      errorMessage = 'AI服务配置错误，请联系管理员'
    } else if (error.message.includes('网络连接失败') || error.message.includes('ENOTFOUND')) {
      errorMessage = '网络连接失败，请检查网络连接'
    } else if (error.message.includes('频率限制') || error.message.includes('429')) {
      errorMessage = 'AI服务使用频率过高，请稍后重试'
    }
    
    // 返回错误信息和默认计划
    const defaultPlan = createDefaultMonthlyPlan(months, prompt)
    defaultPlan.aiError = errorMessage
    
    res.json(defaultPlan)
  }
})

// 创建默认的年度计划
function createDefaultAnnualPlan(goal, keyMetrics, year) {
  const currentYear = year || new Date().getFullYear()
  const monthlyPlans = []
  
  for (let month = 1; month <= 12; month++) {
    monthlyPlans.push({
      month: `${currentYear}-${String(month).padStart(2, '0')}`,
      mainObjective: `完成${goal}的第${month}阶段工作`,
      keyTasks: [
        { title: '项目规划与准备', description: '制定详细的工作计划和资源安排', priority: 'high' },
        { title: '核心任务执行', description: '按计划推进主要工作内容', priority: 'high' },
        { title: '质量检查与优化', description: '检查工作质量并进行必要的优化', priority: 'medium' }
      ],
      metrics: [
        { name: '完成进度', target: `${Math.round((month / 12) * 100)}%` },
        { name: '质量达标率', target: '95%以上' }
      ]
    })
  }
  
  return {
    annualPlan: {
      year: currentYear,
      mainObjective: goal,
      quarterlyMilestones: [
        { quarter: 1, milestone: '项目启动与基础建设', description: '完成项目规划和团队组建' },
        { quarter: 2, milestone: '核心功能开发', description: '完成主要功能模块的开发' },
        { quarter: 3, milestone: '测试与优化', description: '完成系统测试和性能优化' },
        { quarter: 4, milestone: '项目交付与总结', description: '完成项目交付和成果总结' }
      ]
    },
    monthlyPlans
  }
}

// 创建默认的月度计划（当 AI 响应格式不正确时）
function createDefaultMonthlyPlan(months, prompt) {
  const monthlyPlans = months.map((month, index) => {
    const baseTasks = [
      { week: 1, title: '项目启动与规划', description: '制定详细的项目计划和资源分配', priority: 'high', estimatedHours: 16 },
      { week: 2, title: '需求分析与设计', description: '收集需求并制定技术方案', priority: 'high', estimatedHours: 24 },
      { week: 3, title: '开发与测试', description: '按计划推进开发工作并进行测试', priority: 'medium', estimatedHours: 32 },
      { week: 4, title: '验收与优化', description: '完成验收并优化系统性能', priority: 'medium', estimatedHours: 16 }
    ]
    
    return {
      month: month.monthStr,
      mainObjective: `完成第${index + 1}阶段目标`,
      tasks: baseTasks,
      metrics: [
        { name: '完成进度', target: '25%' },
        { name: '质量指标', target: '90分以上' }
      ]
    }
  })
  
  return { monthlyPlans }
}

// AI 周报总结生成（专门用于生成400字左右的总结）
router.post('/weekly-report-summary', authenticateToken, async (req, res) => {
  try {
    const { achievements, challenges, next_week_plan } = req.body
    
    if (!achievements) {
      return res.status(400).json({ error: '请提供本周工作成果' })
    }
    
    const systemPrompt = `你是一个专业的工作总结专家。请根据用户提供的周报内容，生成一段400字左右的总结文字。

重要要求：
1. 总结内容约400字，要求精炼专业
2. 突出工作亮点和成效，体现工作价值
3. 语言要正式、专业，适合在工作汇报中使用
4. 结构清晰，逻辑性强
5. 不要使用项目符号或编号列表

请直接返回总结文字，不需要JSON格式或其他标记。`

    const userPrompt = `本周工作成果：${achievements}
遇到的问题：${challenges || '无特殊问题'}
下周计划：${next_week_plan || '继续推进相关工作'}

请基于以上内容，生成一段400字左右的总结文字，重点突出工作亮点和成效。`

    const summary = await generateAIContent(systemPrompt + '\n\n' + userPrompt, 3, 800)
    
    res.json({ summary })
    
  } catch (error) {
    console.error('AI 周报总结生成错误:', error)
    
    let errorMessage = 'AI服务暂时不可用'
    if (error.message.includes('API密钥无效') || error.message.includes('401')) {
      errorMessage = 'AI服务配置错误，请联系管理员'
    } else if (error.message.includes('网络连接失败') || error.message.includes('ENOTFOUND')) {
      errorMessage = '网络连接失败，请检查网络连接'
    } else if (error.message.includes('频率限制') || error.message.includes('429')) {
      errorMessage = 'AI服务使用频率过高，请稍后重试'
    }
    
    res.status(500).json({ error: errorMessage })
  }
})

// AI 工作总结生成
router.post('/summary-generation', authenticateToken, async (req, res) => {
  try {
    const { type, content, timeframe } = req.body
    
    if (!type || !content) {
      return res.status(400).json({ error: '缺少必要参数' })
    }
    
    let systemPrompt = ''
    let userPrompt = ''
    
    switch (type) {
      case 'weekly':
        systemPrompt = `你是一个专业的工作总结专家。请根据提供的周工作内容，生成一份详细专业的周工作总结。

重要要求：
1. 总结内容至少400字，要求详细具体
2. 包括主要工作成果、工作亮点、遇到的问题和解决方案、下周工作计划
3. 语言专业、条理清晰
4. 突出工作价值和贡献

请严格按照以下JSON格式返回：

{
  "summary": "详细的周工作总结，至少400字，包含具体的工作内容、成果、亮点、问题和解决方案",
  "highlights": ["工作亮点1", "工作亮点2", "工作亮点3"],
  "achievements": ["具体成就1", "具体成就2"],
  "challenges": "遇到的问题和详细解决方案，至少100字",
  "nextWeekPlan": "下周详细工作计划，至少100字"
}`
        userPrompt = `周工作内容：${content}
时间范围：${timeframe || '本周'}
请生成专业的周工作总结，重点突出工作亮点和成就。`
        break
        
      case 'monthly':
        systemPrompt = `你是一个专业的工作总结专家。请根据提供的月度工作内容，生成一份详细专业的月度工作总结。

重要要求：
1. 总结内容至少600字，要求详细具体
2. 包括月度主要成果、工作亮点、下月工作计划
3. 要有数据支撑
4. 体现工作价值和团队贡献

请严格按照以下JSON格式返回：

{
  "summary": "详细的月度工作总结，至少600字，包含月度工作回顾、主要成果、亮点分析、经验总结",
  "highlights": ["突出工作亮点1", "突出工作亮点2", "突出工作亮点3"],
  "achievements": ["具体成就1", "具体成就2", "具体成就3"],
  "lessonsLearned": "详细的工作成效总结，至100字",
  "nextMonthPlan": "下月详细工作计划，至少200字"
}`
        userPrompt = `月度工作内容：${content}
时间范围：${timeframe || '本月'}
请生成专业的月度工作总结，重点突出工作亮点和主要成就。`
        break
        
      case 'annual':
        systemPrompt = `你是一个专业的工作总结专家。请根据提供的年度工作内容，生成一份详细专业的年度工作总结。

重要要求：
1. 总结内容至少3000字，要求全面详细
2. 包括年度工作回顾、主要成就、突出贡献、个人成长、来年规划
3. 要有详实的数据、具体案例和深度分析
4. 体现个人价值和职业发展

请严格按照以下JSON格式返回：

{
  "summary": "详细的年度工作总结，至少3000字，包含全年工作回顾、主要成就、突出贡献、个人成长、经验教训",
  "highlights": ["年度重大亮点1", "年度重大亮点2", "年度重大亮点3"],
  "achievements": ["年度重要成就1", "年度重要成就2", "年度重要成就3"],
  "personalGrowth": "详细的工作成效总结，至少500字",
  "nextYearPlan": "来年详细工作规划，至少500字"
}`
        userPrompt = `年度工作内容：${content}
时间范围：${timeframe || '本年度'}
请生成专业的年度工作总结，重点突出年度亮点和主要成就。`
        break
        
      default:
        return res.status(400).json({ error: '不支持的总结类型' })
    }
    
    // 为工作总结生成使用更多token
    const maxTokens = type === 'annual' ? 6000 : type === 'monthly' ? 4000 : 3000
    const aiResponse = await generateAIContent(systemPrompt + '\n\n' + userPrompt, 3, maxTokens)
    
    // 解析 AI 响应
    let summary
    try {
      summary = JSON.parse(aiResponse)
    } catch (error) {
      console.log('工作总结JSON解析失败，尝试修复格式:', error.message)
      try {
        const fixedResponse = fixJSONFormat(aiResponse)
        summary = JSON.parse(fixedResponse)
      } catch (secondError) {
        console.log('修复JSON格式失败，尝试提取JSON对象:', secondError.message)
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const extractedJson = fixJSONFormat(jsonMatch[0])
            summary = JSON.parse(extractedJson)
          } else {
            throw new Error('无法从AI响应中提取有效的JSON')
          }
        } catch (finalError) {
          console.log('所有JSON解析尝试都失败，使用默认总结:', finalError.message)
          summary = createDefaultSummary(type, content)
        }
      }
    }
    
    res.json(summary)
    
  } catch (error) {
    console.error('AI 工作总结生成错误:', error)
    
    // 提供更友好的错误信息
    let errorMessage = 'AI服务暂时不可用'
    
    if (error.message.includes('API密钥无效') || error.message.includes('401')) {
      errorMessage = 'AI服务配置错误，请联系管理员'
    } else if (error.message.includes('网络连接失败') || error.message.includes('ENOTFOUND')) {
      errorMessage = '网络连接失败，请检查网络连接'
    } else if (error.message.includes('频率限制') || error.message.includes('429')) {
      errorMessage = 'AI服务使用频率过高，请稍后重试'
    }
    
    // 返回错误信息和默认总结
    const defaultSummary = createDefaultSummary(type, content)
    defaultSummary.aiError = errorMessage
    
    res.json(defaultSummary)
  }
})

// 创建JSON格式的默认年度计划
function createDefaultAnnualPlan(goal, keyMetrics, year) {
  const currentYear = year || new Date().getFullYear()
  
  const monthlyPlans = []
  for (let month = 1; month <= 12; month++) {
    monthlyPlans.push({
      month: `${currentYear}-${String(month).padStart(2, '0')}`,
      title: `${month}月工作计划`,
      tasks: [
        {
          title: '项目规划与准备',
          description: '制定详细的工作计划和资源安排',
          priority: 'high',
          estimatedHours: 40
        },
        {
          title: '核心任务执行',
          description: '按计划推进主要工作内容',
          priority: 'high',
          estimatedHours: 80
        },
        {
          title: '质量检查与优化',
          description: '检查工作质量并进行必要的优化',
          priority: 'medium',
          estimatedHours: 20
        }
      ],
      keyMetrics: ['完成进度达标', '质量指标合格', '按时交付']
    })
  }
  
  return {
    annualPlan: {
      title: `${currentYear}年${goal.substring(0, 20)}工作计划`,
      objective: `通过系统化的项目管理措施，实现${goal}，达成预期效果`,
      strategies: ['制定详细实施计划', '建立监控机制', '持续优化改进'],
      expectedOutcomes: ['目标达成率90%以上', '质量指标达标', '按时完成']
    },
    monthlyPlans
  }
}

// JSON格式修复函数
function fixJSONFormat(jsonString) {
  let fixed = jsonString
  
  console.log('原始JSON字符串长度:', jsonString.length)
  
  try {
    // 首先尝试直接解析，如果成功就直接返回
    JSON.parse(jsonString)
    console.log('原始JSON格式正确，无需修复')
    return jsonString
  } catch (initialError) {
    console.log('需要修复JSON格式，错误位置:', initialError.message)
  }
  
  // 1. 修复最常见的数组元素缺少逗号问题
  // 匹配模式：引号 换行 引号
  fixed = fixed.replace(/"\s*\r?\n\s*"/g, '",\n"')
  
  // 2. 修复对象之间的逗号
  fixed = fixed.replace(/}\s*\r?\n\s*{/g, '},\n{')
  fixed = fixed.replace(/}\s*{/g, '},{')
  
  // 3. 修复单引号为双引号
  fixed = fixed.replace(/'/g, '"')
  
  // 4. 修复多余的结尾逗号
  fixed = fixed.replace(/,\s*]/g, ']')
  fixed = fixed.replace(/,\s*}/g, '}')
  
  // 5. 修复中文标点
  fixed = fixed.replace(/，/g, ',')
  fixed = fixed.replace(/；/g, ';')
  
  // 6. 尝试提取最外层的大括号内容
  const braceMatch = fixed.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    fixed = braceMatch[0]
  }
  
  console.log('修复后的JSON字符串长度:', fixed.length)
  
  return fixed
}

// 创建默认的工作总结
function createDefaultSummary(type, content) {
  const baseSummary = {
    summary: `基于工作内容生成的${type === 'weekly' ? '周' : type === 'monthly' ? '月' : '年'}度工作总结`,
    highlights: ['工作内容完整', '按时完成任务', '质量达标'],
    achievements: ['完成既定目标', '达成预期效果']
  }
  
  if (type === 'weekly') {
    return {
      ...baseSummary,
      challenges: '遇到一些技术难题，通过团队协作成功解决',
      nextWeekPlan: '继续推进项目进度，优化工作流程'
    }
  } else if (type === 'monthly') {
    return {
      ...baseSummary,
      lessonsLearned: '需要加强时间管理和跨部门沟通',
      nextMonthPlan: '制定更详细的工作计划，提升工作效率'
    }
  } else {
    return {
      ...baseSummary,
      personalGrowth: '专业技能得到提升，团队协作能力增强',
      nextYearPlan: '设定更具挑战性的目标，持续学习成长'
    }
  }
}

module.exports = router
