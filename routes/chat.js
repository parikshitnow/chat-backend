const express = require('express');
const ConnectionRequest = require('../models/ConnectionRequest');
const User = require('../models/User');
const router = express.Router();

router.get('/search', async (req, res) => {
  const { username } = req.params;
  try {
    const users = await User.find({ username: new RegExp(username, 'i') }).select('username');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error searching users' });
  }
});

router.post('/request', async (req, res) => {
  const { fromUserId, toUserId } = req.body;
  try {
    const request = new ConnectionRequest({ from: fromUserId, to: toUserId });
    await request.save();
    res.status(201).json({ message: 'Connection request sent' });
  } catch (error) {
    res.status(500).json({ error: 'Error sending connection request' });
  }
});

router.post('/respond', async (req, res) => {
  const { requestId, status } = req.body;
  try {
    const request = await ConnectionRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = status;
    await request.save();

    if (status === 'accepted') {
      const fromUser = await User.findById(request.from);
      const toUser = await User.findById(request.to);

      fromUser.connections.push(toUser._id);
      toUser.connections.push(fromUser._id);

      await fromUser.save();
      await toUser.save();
    }
    res.status(200).json({ message: `Request ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Error responding to connection request' });
  }
});

module.exports = router;
