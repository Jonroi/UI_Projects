import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API endpoint for physics presets (future expansion)
app.get('/api/presets', (req, res) => {
  res.json({
    presets: [
      { id: 'default', name: 'Default Physics', k: 100, c: 0.05, g: 9.8 },
      { id: 'microgravity', name: 'Microgravity', k: 300, c: 0.02, g: 0 },
      { id: 'heavy-damping', name: 'Heavy Damping', k: 50, c: 0.3, g: 20 },
    ],
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Spring-Mass Simulation Server');
  console.log('================================');
  console.log(`🌐 Local:    http://localhost:${PORT}`);
  console.log(`🌍 Network:  http://192.168.1.100:${PORT}`);
  console.log('================================');
  console.log('📊 Features:');
  console.log('   • Real-time physics simulation');
  console.log('   • Interactive mass-spring system');
  console.log('   • Energy visualization');
  console.log('   • Professional UI');
  console.log('================================');
  console.log('🛠️  Commands:');
  console.log('   • npm start     - Start production server');
  console.log('   • npm run dev   - Start development server');
  console.log('   • npm run serve - Alias for npm start');
  console.log('================================');
  console.log(`✨ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 Process ID: ${process.pid}`);
  console.log('================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});
