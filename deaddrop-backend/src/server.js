require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { startExpirySweeper } = require('./jobs/expirySweeper');

const authRoutes = require('./routes/authRoutes');
const packageRoutes = require('./routes/packageRoutes');
const accessRoutes = require('./routes/accessRoutes');
const receivedRoutes = require('./routes/receivedRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options(/.*/, cors({
  origin: process.env.CLIENT_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/received-packages', receivedRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  startExpirySweeper();
  app.listen(PORT, () => console.log(`[server] DeadDrop API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
