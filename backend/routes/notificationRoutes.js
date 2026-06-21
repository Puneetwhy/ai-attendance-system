const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Notification } = require('../models/index');

router.use(protect);

router.get('/', async (req, res) => {
  const { page = 1, limit = 20, isRead } = req.query;
  const filter = { recipient: req.user.id };
  if (isRead !== undefined) filter.isRead = isRead === 'true';
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).populate('sender', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user.id, isRead: false }),
  ]);
  res.json({ success: true, data: notifications, total, unreadCount, totalPages: Math.ceil(total / parseInt(limit)) });
});

router.put('/:id/read', async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
  res.json({ success: true, message: 'Marked as read' });
});

router.put('/mark-all-read', async (req, res) => {
  await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ success: true, message: 'All notifications marked as read' });
});

router.delete('/:id', async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Notification deleted' });
});

module.exports = router;
