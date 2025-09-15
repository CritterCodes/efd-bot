/**
 * Discord Bot Documentation Express Server Integration
 * 
 * This file provides integration instructions and sample code for adding
 * Discord bot documentation to your existing bot.engelfinedesign.com Express server.
 * 
 * @author GitHub Copilot
 * @version 1.0.0
 */

import express from 'express';
import docsRouter from './routes/docs.js';

/**
 * Integration Instructions for bot.engelfinedesign.com
 * 
 * Add the following to your existing Express app:
 * 
 * 1. Copy the routes/docs.js file to your server
 * 2. Copy the docs/api/ directory to your server 
 * 3. Add the following middleware to your Express app
 */

export function setupDocumentationRoutes(app) {
    // Mount the documentation API at /api/docs
    app.use('/api/docs', docsRouter);
    
    // Optional: Add a redirect from /docs to the main documentation page
    app.get('/docs', (req, res) => {
        res.redirect('/api/docs/');
    });
    
    console.log('📖 Documentation routes mounted:');
    console.log('  🌐 Interactive Docs: https://bot.engelfinedesign.com/api/docs/');
    console.log('  📊 API Endpoints:');
    console.log('    GET /api/docs/commands - All commands');
    console.log('    GET /api/docs/commands/:name - Specific command');
    console.log('    GET /api/docs/commands/category/:category - Commands by category');
    console.log('    GET /api/docs/categories - List all categories');
    console.log('    GET /api/docs/search?q=term - Search commands');
    console.log('    GET /api/docs/stats - Documentation statistics');
    console.log('    GET /api/docs/markdown - Markdown documentation');
    console.log('    GET /api/docs/health - Health check');
}

/**
 * Sample Express App (for reference)
 * This shows how to integrate with your existing server
 */
export function createSampleApp() {
    const app = express();
    
    // Your existing middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Add CORS for external access
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        next();
    });
    
    // Mount documentation routes
    setupDocumentationRoutes(app);
    
    // Your existing routes
    app.get('/', (req, res) => {
        res.json({
            message: 'EFD Bot API Server',
            documentation: '/api/docs/',
            version: '1.0.0'
        });
    });
    
    return app;
}

/**
 * Auto-update integration
 * Call this function when you want to regenerate documentation
 */
export async function updateDocumentation() {
    try {
        console.log('🔄 Updating Discord bot documentation...');
        
        // Import and run the documentation generator
        const { CommandDocsGenerator } = await import('./scripts/generate-docs.js');
        const generator = new CommandDocsGenerator();
        await generator.generateDocs();
        
        console.log('✅ Documentation updated successfully!');
        return { success: true, timestamp: new Date().toISOString() };
    } catch (error) {
        console.error('❌ Failed to update documentation:', error);
        return { success: false, error: error.message, timestamp: new Date().toISOString() };
    }
}

/**
 * API endpoint to trigger documentation update
 * POST /api/docs/update
 */
export function createUpdateEndpoint(app) {
    app.post('/api/docs/update', async (req, res) => {
        try {
            const result = await updateDocumentation();
            
            if (result.success) {
                res.json({
                    message: 'Documentation updated successfully',
                    ...result
                });
            } else {
                res.status(500).json({
                    message: 'Failed to update documentation',
                    ...result
                });
            }
        } catch (error) {
            res.status(500).json({
                message: 'Error updating documentation',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
}

// Example usage:
// import { setupDocumentationRoutes, createUpdateEndpoint } from './docs-integration.js';
// 
// const app = express();
// setupDocumentationRoutes(app);
// createUpdateEndpoint(app);
// 
// app.listen(3000, () => {
//     console.log('Server running on port 3000');
//     console.log('Documentation available at: http://localhost:3000/api/docs/');
// });