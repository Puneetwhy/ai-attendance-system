const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const OpenAI = require('openai');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

router.use(protect);

router.post('/message', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'Message required' });
  let context = '';
  if (req.user.role === 'student') {
    const sp = await Student.findOne({ user: req.user.id }).populate('department', 'name').select('rollNumber attendanceStats leaveBalance');
    if (sp) context = `Student: ${sp.rollNumber}, Dept: ${sp.department?.name}, Attendance: ${sp.attendanceStats.percentage}%, Leave Remaining: ${sp.leaveBalance.remaining} days, Eligible for Exam (75%+): ${parseFloat(sp.attendanceStats.percentage) >= 75 ? 'YES' : 'NO'}`;
  }
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', max_tokens: 400, temperature: 0.7,
      messages: [
        { role: 'system', content: `You are an AI assistant for an attendance management system. User role: ${req.user.role}. Context: ${context}. Be concise and helpful.` },
        ...history.slice(-8),
        { role: 'user', content: message },
      ],
    });
    res.json({ success: true, reply: completion.choices[0].message.content });
  } catch {
    res.status(503).json({ success: false, message: 'AI service unavailable' });
  }
});
module.exports = router;
