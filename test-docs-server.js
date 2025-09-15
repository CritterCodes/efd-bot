/**
 * Test Documentation Server
 * 
 * This is a standalone test server to demonstrate the documentation system.
 * You can run this to see how the documentation would work on bot.engelfinedesign.com
 * 
 * Usage: node test-docs-server.js
 */

import express from 'express';
import { setupDocumentationRoutes, createUpdateEndpoint } from './docs-integration.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Mount documentation routes
setupDocumentationRoutes(app);
createUpdateEndpoint(app);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'EFD Discord Bot Documentation Server',
        version: '1.0.0',
        description: 'Comprehensive documentation for EFD Discord bot commands',
        endpoints: {
            documentation: '/api/docs/',
            allCommands: '/api/docs/commands',
            categories: '/api/docs/categories',
            search: '/api/docs/search?q=gems',
            stats: '/api/docs/stats',
            health: '/api/docs/health',
            update: 'POST /api/docs/update'
        },
        examples: [
            'GET /api/docs/commands/gems - Get GEMS command documentation',
            'GET /api/docs/commands/category/Economy - Get all economy commands',
            'GET /api/docs/search?q=balance - Search for commands containing "balance"'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.path} not found`,
        availableEndpoints: [
            'GET /',
            'GET /api/docs/',
            'GET /api/docs/commands',
            'GET /api/docs/categories',
            'GET /api/docs/search',
            'GET /api/docs/stats',
            'POST /api/docs/update'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 EFD Bot Documentation Server running on port ${PORT}`);
    console.log(`\n📖 Documentation URLs:`);
    console.log(`  🌐 Interactive Documentation: http://localhost:${PORT}/api/docs/`);
    console.log(`  📊 API Root: http://localhost:${PORT}/`);
    console.log(`  🔍 All Commands: http://localhost:${PORT}/api/docs/commands`);
    console.log(`  📂 Categories: http://localhost:${PORT}/api/docs/categories`);
    console.log(`  🔎 Search Example: http://localhost:${PORT}/api/docs/search?q=gems`);
    console.log(`  📈 Statistics: http://localhost:${PORT}/api/docs/stats`);
    console.log(`  ❤️ Health Check: http://localhost:${PORT}/api/docs/health`);
    console.log(`\n💡 To update documentation: POST http://localhost:${PORT}/api/docs/update`);
    console.log(`\n🔗 For bot.engelfinedesign.com integration, see docs-integration.js\n`);
});