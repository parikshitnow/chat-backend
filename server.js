const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const User = require('./models/User'); // Ensure you import the User model
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`User ${userId} joined`);
  });

  socket.on('sendConnectionRequest', async ({ fromUserId, toUserId }) => {
    try {
      // Ensure both users are valid and exist in the database
      const fromUser = await User.findById(fromUserId);
      const toUser = await User.findById(toUserId);

      if (!fromUser || !toUser) {
        return socket.emit('error', { message: 'One or both users not found' });
      }

      // Emit the connection request to the recipient
      const recipientSocketId = userSockets.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('newConnectionRequest', {
          fromUserId,
          message: `${fromUser.username} has sent you a connection request!`,
        });
      } else {
        // If the recipient is not online, you might want to store the request or notify later
        console.log(`User ${toUserId} is not online.`);
      }
    } catch (error) {
      console.error('Error handling connection request:', error);
      socket.emit('error', { message: 'Error sending connection request' });
    }
  });

  socket.on('disconnect', () => {
    // Clean up the socket map when a user disconnects
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
