const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

// Register Route
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    return res.status(400).json({ error: 'Error registering user' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    return res.status(200).json({ token, id: user._id, username: user.username });
  } catch (err) {
    return res.status(500).json({ error: 'Error logging in' });
  }
});

// Get User Connections
router.get('/connections/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId).populate('connections', 'username id');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user.connections);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching connections' });
  }
});

// Search Users by Username (New API)
router.get('/search', async (req, res) => {
    const { username } = req.query;
    console.log(username);
    
  try {
    if (!username) {
      return res.status(400).json({ error: 'Username query is required' });
    }
    console.log(username);
    
    // Search users by username (case-insensitive)
    const users = await User.find({
      username: { $regex: username, $options: 'i' }, // Case-insensitive search
    }).limit(10); // Limit to 10 results for efficiency

    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Return the matching users
    return res.status(200).json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during search' });
  }
});

module.exports = router;
