const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Settings } = require('../models/index');
router.use(protect);
router.get('/', authorize('admin'), async (req, res) => { const settings = await Settings.find(); res.json({ success: true, data: settings }); });
router.put('/:key', authorize('admin'), async (req, res) => { const s = await Settings.findOneAndUpdate({ key: req.params.key }, { value: req.body.value, updatedBy: req.user.id }, { new: true, upsert: true }); res.json({ success: true, data: s }); });
module.exports = router;
