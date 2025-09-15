/**
 * Discord Bot Documentation API Routes
 * 
 * Express routes for serving Discord command documentation
 * with REST API endpoints and interactive web interface.
 * 
 * @author GitHub Copilot
 * @version 1.0.0
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Path to documentation files
const DOCS_DIR = path.join(__dirname, '..', 'docs', 'api');

/**
 * API endpoint to get all commands documentation
 * GET /api/docs/commands
 */
router.get('/commands', async (req, res) => {
    try {
        const commandsPath = path.join(DOCS_DIR, 'commands.json');
        const commandsData = await fs.readFile(commandsPath, 'utf-8');
        const commands = JSON.parse(commandsData);
        
        // Add CORS headers for external access
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        res.json(commands);
    } catch (error) {
        console.error('Error loading commands documentation:', error);
        res.status(500).json({
            error: 'Failed to load commands documentation',
            message: error.message
        });
    }
});

/**
 * API endpoint to get admin commands documentation
 * GET /api/docs/admin-commands
 */
router.get('/admin-commands', async (req, res) => {
    try {
        const adminCommandsPath = path.join(DOCS_DIR, 'admin-commands.json');
        const adminCommandsData = await fs.readFile(adminCommandsPath, 'utf-8');
        const adminCommands = JSON.parse(adminCommandsData);
        
        // Add CORS headers for external access
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        res.json(adminCommands);
    } catch (error) {
        console.error('Error loading admin commands documentation:', error);
        res.status(500).json({
            error: 'Failed to load admin commands documentation',
            message: error.message
        });
    }
});

/**
 * API endpoint to get a specific command's documentation
 * GET /api/docs/commands/:commandName
 */
router.get('/commands/:commandName', async (req, res) => {
    try {
        const { commandName } = req.params;
        const commandsPath = path.join(DOCS_DIR, 'commands.json');
        const commandsData = await fs.readFile(commandsPath, 'utf-8');
        const { commands } = JSON.parse(commandsData);
        
        const command = commands.find(cmd => cmd.name === commandName);
        
        if (!command) {
            return res.status(404).json({
                error: 'Command not found',
                message: `Command '${commandName}' does not exist`
            });
        }
        
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        res.json(command);
    } catch (error) {
        console.error('Error loading command documentation:', error);
        res.status(500).json({
            error: 'Failed to load command documentation',
            message: error.message
        });
    }
});

/**
 * API endpoint to get commands by category
 * GET /api/docs/commands/category/:categoryName
 */
router.get('/commands/category/:categoryName', async (req, res) => {
    try {
        const { categoryName } = req.params;
        const commandsPath = path.join(DOCS_DIR, 'commands.json');
        const commandsData = await fs.readFile(commandsPath, 'utf-8');
        const { commands, metadata } = JSON.parse(commandsData);
        
        const categoryCommands = commands.filter(cmd => 
            cmd.category.toLowerCase() === categoryName.toLowerCase()
        );
        
        if (categoryCommands.length === 0) {
            return res.status(404).json({
                error: 'Category not found',
                message: `Category '${categoryName}' does not exist or has no commands`
            });
        }
        
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        res.json({
            category: categoryName,
            commandCount: categoryCommands.length,
            commands: categoryCommands,
            metadata: metadata
        });
    } catch (error) {
        console.error('Error loading category documentation:', error);
        res.status(500).json({
            error: 'Failed to load category documentation',
            message: error.message
        });
    }
});

/**
 * API endpoint to get list of all categories
 * GET /api/docs/categories
 */
router.get('/categories', async (req, res) => {
    try {
        const commandsPath = path.join(DOCS_DIR, 'commands.json');
        const commandsData = await fs.readFile(commandsPath, 'utf-8');
        const { commands } = JSON.parse(commandsData);
        
        const categories = [...new Set(commands.map(cmd => cmd.category))];
        const categoryStats = categories.map(category => {
            const categoryCommands = commands.filter(cmd => cmd.category === category);
            return {
                name: category,
                commandCount: categoryCommands.length,
                adminCommands: categoryCommands.filter(cmd => cmd.adminOnly).length,
                publicCommands: categoryCommands.filter(cmd => !cmd.adminOnly).length
            };
        });
        
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        res.json({
            totalCategories: categories.length,
            totalCommands: commands.length,
            categories: categoryStats
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        res.status(500).json({
            error: 'Failed to load categories',
            message: error.message
        });
    }
});

/**
 * Search endpoint for commands
 * GET /api/docs/search?q=searchterm
 */
router.get('/search', async (req, res) => {
    try {
        const { q: searchTerm } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({
                error: 'Missing search term',
                message: 'Please provide a search term using the "q" parameter'
            });
        }
        
        const commandsPath = path.join(DOCS_DIR, 'commands.json');
        const commandsData = await fs.readFile(commandsPath, 'utf-8');
        const { commands } = JSON.parse(commandsData);
        
        const searchLower = searchTerm.toLowerCase();
        const results = commands.filter(cmd => 
            cmd.name.toLowerCase().includes(searchLower) ||
            cmd.description.toLowerCase().includes(searchLower) ||
            cmd.category.toLowerCase().includes(searchLower) ||
            cmd.parameters.some(param => 
                param.name.toLowerCase().includes(searchLower) ||
                param.description.toLowerCase().includes(searchLower)
            )
        );
        
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        res.json({
            searchTerm: searchTerm,
            resultCount: results.length,
            results: results
        });
    } catch (error) {
        console.error('Error searching commands:', error);
        res.status(500).json({
            error: 'Failed to search commands',
            message: error.message
        });
    }
});

/**
 * Serve the interactive HTML documentation (user commands only)
 * GET /docs or GET /docs/
 */
router.get(['/', '/docs', '/docs/'], async (req, res) => {
    try {
        const htmlPath = path.join(DOCS_DIR, 'modern-commands.html');
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        
        res.set('Content-Type', 'text/html');
        res.send(htmlContent);
    } catch (error) {
        console.error('Error serving HTML documentation:', error);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Documentation Error</h1>
                    <p>Failed to load user documentation. Please try again later.</p>
                    <p>Error: ${error.message}</p>
                </body>
            </html>
        `);
    }
});

/**
 * Serve the interactive HTML admin documentation (all commands)
 * GET /admin or GET /admin/
 */
router.get(['/admin', '/admin/'], async (req, res) => {
    try {
        const htmlPath = path.join(DOCS_DIR, 'admin-commands.html');
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        
        res.set('Content-Type', 'text/html');
        res.send(htmlContent);
    } catch (error) {
        console.error('Error serving admin HTML documentation:', error);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Admin Documentation Error</h1>
                    <p>Failed to load admin documentation. Please try again later.</p>
                    <p>Error: ${error.message}</p>
                </body>
            </html>
        `);
    }
});

/**
 * Get documentation metadata and statistics
 * GET /api/docs/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const commandsPath = path.join(DOCS_DIR, 'commands.json');
        const commandsData = await fs.readFile(commandsPath, 'utf-8');
        const { commands, metadata } = JSON.parse(commandsData);
        
        const stats = {
            ...metadata,
            stats: {
                totalCommands: commands.length,
                adminCommands: commands.filter(cmd => cmd.adminOnly).length,
                publicCommands: commands.filter(cmd => !cmd.adminOnly).length,
                guildOnlyCommands: commands.filter(cmd => cmd.guildOnly).length,
                categories: [...new Set(commands.map(cmd => cmd.category))].length,
                totalParameters: commands.reduce((total, cmd) => total + cmd.parameters.length, 0),
                commandsWithExamples: commands.filter(cmd => cmd.examples.length > 0).length
            },
            lastGenerated: metadata.generated
        };
        
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        res.json(stats);
    } catch (error) {
        console.error('Error loading documentation stats:', error);
        res.status(500).json({
            error: 'Failed to load documentation statistics',
            message: error.message
        });
    }
});

/**
 * Get markdown documentation
 * GET /api/docs/markdown
 */
router.get('/markdown', async (req, res) => {
    try {
        const markdownPath = path.join(DOCS_DIR, 'commands.md');
        const markdownContent = await fs.readFile(markdownPath, 'utf-8');
        
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.set('Content-Type', 'text/markdown');
        
        res.send(markdownContent);
    } catch (error) {
        console.error('Error serving markdown documentation:', error);
        res.status(500).json({
            error: 'Failed to load markdown documentation',
            message: error.message
        });
    }
});

/**
 * Health check endpoint
 * GET /api/docs/health
 */
router.get('/health', async (req, res) => {
    try {
        const commandsPath = path.join(DOCS_DIR, 'commands.json');
        await fs.access(commandsPath);
        
        res.json({
            status: 'healthy',
            message: 'Documentation API is operational',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            message: 'Documentation files not accessible',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;