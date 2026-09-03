import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import Admin from './models/Admin.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store io instance on app for controllers to use
app.set('socketio', io);

io.on('connection', (socket) => {
  // Join tournament room
  socket.on('join:tournament', (tournamentId) => {
    socket.join(`tournament:${tournamentId}`);
  });

  socket.on('leave:tournament', (tournamentId) => {
    socket.leave(`tournament:${tournamentId}`);
  });
});

async function autoSeedAdmin() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const email = (process.env.ADMIN_EMAIL || 'admin@nsk-esports.in').toLowerCase();
      const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
      await Admin.create({
        email,
        password,
        name: 'Super Admin',
        role: 'admin'
      });
      console.log(`[Seed] Initial admin user auto-created with email: ${email}`);
    }
  } catch (err) {
    console.error('[Seed] Error auto-seeding admin:', err.message);
  }
}

async function startServer() {
  await connectDB();
  await autoSeedAdmin();

  server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 NSK-ESPORTS API Server running on port ${PORT}`);
    console.log(`🔗 Healthcheck: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });
}

startServer();
