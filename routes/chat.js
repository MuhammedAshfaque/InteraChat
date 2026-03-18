const express = require('express');
const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/groups', authMiddleware, async (req, res) => {
  try {
    const { name, members } = req.body;
    const allMembers = [...new Set([...members, req.user.id])];
    
    const group = new Group({
      name,
      members: allMembers,
      createdBy: req.user.id
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/groups', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id }).populate('members', 'username');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/messages/:userId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    }).sort('timestamp');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/group-messages/:groupId', authMiddleware, async (req, res) => {
  try {
    // Verify user is in group
    const group = await Group.findById(req.params.groupId);
    if (!group || !group.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized for this group' });
    }

    const messages = await Message.find({ groupId: req.params.groupId }).sort('timestamp').populate('sender', 'username');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
