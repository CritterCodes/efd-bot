/**
 * Discord Command Documentation Generator
 * 
 * Automatically generates comprehensive documentation for all Discord commands
 * including parameters, examples, permissions, and usage guides.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CommandDocsGenerator {
    constructor() {
        this.commandsDir = path.join(__dirname, '..', 'src', 'commands');
        this.outputDir = path.join(__dirname, '..', 'docs', 'api');
        this.commands = [];
    }

    async generateDocs() {
        console.log('🚀 Starting Discord Command Documentation Generation\n');

        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            console.log(`📁 Created output directory: ${this.outputDir}`);

            await this.scanCommands();
            await this.generateJSON();
            await this.generateMarkdown();
            await this.generateHTML();

            console.log('✅ Documentation generation completed successfully!');

        } catch (error) {
            console.error('❌ Error generating documentation:', error);
            throw error;
        }
    }

    async scanCommands() {
        console.log('🔍 Scanning command files...');

        try {
            const commandFiles = await fs.readdir(this.commandsDir);
            const jsFiles = commandFiles.filter(file => file.endsWith('.js'));

            console.log(`Found ${jsFiles.length} JavaScript files: ${jsFiles.join(', ')}`);

            for (const file of jsFiles) {
                try {
                    const commandDoc = await this.analyzeCommandFile(file);
                    if (commandDoc) {
                        this.commands.push(commandDoc);
                        console.log(`  ✅ Processed: ${commandDoc.name}`);
                    }
                } catch (error) {
                    console.log(`  ⚠️  Warning: Could not process ${file} - ${error.message}`);
                }
            }

            console.log(`📋 Successfully processed ${this.commands.length} commands\n`);
        } catch (error) {
            console.error('Error scanning commands:', error);
            throw error;
        }
    }

    async analyzeCommandFile(filename) {
        const commandPath = path.join(this.commandsDir, filename);
        const content = await fs.readFile(commandPath, 'utf-8');
        
        const commandDoc = {
            name: this.extractCommandName(content, filename),
            description: this.extractDescription(content),
            filename: filename,
            category: this.inferCategory(filename),
            usage: this.extractUsage(content),
            parameters: this.extractParametersFromContent(content),
            examples: this.generateExamplesFromName(filename),
            permissions: this.extractPermissionsFromContent(content),
            adminOnly: this.detectAdminOnly(content),
            guildOnly: content.includes('dm_permission') && content.includes('false'),
            version: '1.0.0',
            lastUpdated: new Date().toISOString()
        };

        return commandDoc;
    }

    /**
     * Detect if a command is admin-only based on permission settings
     */
    detectAdminOnly(content) {
        // Check for Discord permission flags
        if (content.includes('PermissionFlagsBits.Administrator')) return true;
        if (content.includes('setDefaultMemberPermissions(PermissionFlagsBits.Administrator)')) return true;
        if (content.includes('PermissionsBitField.Flags.Administrator')) return true;
        
        // Check for common admin patterns
        if (content.includes('admin') && (content.includes('only') || content.includes('Only'))) return true;
        if (content.includes('Admin') && (content.includes('command') || content.includes('Command'))) return true;
        
        // Check filename patterns
        if (content.includes('roadmap-admin') || content.includes('setup-verify')) return true;
        
        return false;
    }

    extractCommandName(content, filename) {
        const nameMatch = content.match(/\.setName\(['"`]([^'"`]+)['"`]\)/);
        if (nameMatch) {
            return nameMatch[1];
        }
        return filename.replace('.js', '');
    }

    extractDescription(content) {
        const descMatch = content.match(/\.setDescription\(['"`]([^'"`]+)['"`]\)/);
        if (descMatch) {
            return descMatch[1];
        }
        
        const jsdocMatch = content.match(/\/\*\*[\s\S]*?\*\s*([^@\n]+)/);
        if (jsdocMatch) {
            return jsdocMatch[1].trim();
        }
        
        return 'No description available';
    }

    extractUsage(content) {
        const commandName = this.extractCommandName(content, '');
        
        if (content.includes('addUserOption')) {
            return [`/${commandName} @user`];
        }
        if (content.includes('addIntegerOption')) {
            return [`/${commandName} <amount>`];
        }
        if (content.includes('addStringOption')) {
            return [`/${commandName} <text>`];
        }
        
        return [`/${commandName}`];
    }

    extractParametersFromContent(content) {
        const parameters = [];
        
        // Extract all option types
        const optionPatterns = [
            { type: 'User', pattern: /addUserOption\([\s\S]*?(?=\.add|$)/ },
            { type: 'Integer', pattern: /addIntegerOption\([\s\S]*?(?=\.add|$)/ },
            { type: 'String', pattern: /addStringOption\([\s\S]*?(?=\.add|$)/ },
            { type: 'Boolean', pattern: /addBooleanOption\([\s\S]*?(?=\.add|$)/ }
        ];

        optionPatterns.forEach(({ type, pattern }) => {
            const matches = content.match(new RegExp(pattern.source, 'g'));
            if (matches) {
                matches.forEach(match => {
                    const nameMatch = match.match(/\.setName\(['"`]([^'"`]+)['"`]\)/);
                    const descMatch = match.match(/\.setDescription\(['"`]([^'"`]+)['"`]\)/);
                    const required = match.includes('.setRequired(true)');
                    
                    if (nameMatch && descMatch) {
                        parameters.push({
                            name: nameMatch[1],
                            type: type,
                            description: descMatch[1],
                            required: required
                        });
                    }
                });
            }
        });
        
        return parameters;
    }

    generateExamplesFromName(filename) {
        const commandName = filename.replace('.js', '');
        const examples = [];

        switch (commandName) {
            case 'gems':
                examples.push(
                    { command: '/gems balance', description: 'Check your GEMS balance' },
                    { command: '/gems leaderboard', description: 'View server GEMS rankings' },
                    { command: '/gems transfer @user 100 reason', description: 'Transfer GEMS to another user' }
                );
                break;
            case 'tip':
                examples.push(
                    { command: '/tip @user 50', description: 'Tip 50 GEMS to another user' },
                    { command: '/tip @user 100 Great work!', description: 'Tip with a custom reason' }
                );
                break;
            default:
                examples.push({
                    command: `/${commandName}`,
                    description: `Execute the ${commandName} command`
                });
        }

        return examples;
    }

    extractPermissionsFromContent(content) {
        if (content.includes('admin') || content.includes('Admin')) {
            return ['Administrator'];
        }
        if (content.includes('dm_permission') && content.includes('false')) {
            return ['Guild Only'];
        }
        return ['Everyone'];
    }

    inferCategory(filename) {
        if (filename.includes('gems') || filename.includes('tip')) return 'Economy';
        if (filename.includes('verify') || filename.includes('auth')) return 'Verification';
        if (filename.includes('admin') || filename.includes('mod')) return 'Administration';
        return 'General';
    }

    async generateJSON() {
        console.log('📄 Generating JSON documentation...');
        
        const jsonDoc = {
            metadata: {
                title: 'EFD Discord Bot Commands',
                description: 'Comprehensive documentation for all Discord bot commands',
                version: '1.0.0',
                generated: new Date().toISOString(),
                commandCount: this.commands.length
            },
            commands: this.commands
        };

        await fs.writeFile(
            path.join(this.outputDir, 'commands.json'),
            JSON.stringify(jsonDoc, null, 2)
        );
        console.log('  ✅ Created commands.json');
    }

    async generateMarkdown() {
        console.log('📝 Generating Markdown documentation...');
        
        let markdown = `# EFD Discord Bot Commands\n\n`;
        markdown += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
        markdown += `## Command Overview\n\n`;
        markdown += `Total Commands: **${this.commands.length}**\n\n`;

        const categories = [...new Set(this.commands.map(cmd => cmd.category))];
        
        for (const category of categories) {
            const categoryCommands = this.commands.filter(cmd => cmd.category === category);
            
            markdown += `## ${category} Commands\n\n`;
            
            for (const command of categoryCommands) {
                markdown += `### /${command.name}\n\n`;
                markdown += `${command.description}\n\n`;
                
                if (command.parameters.length > 0) {
                    markdown += `**Parameters:**\n\n`;
                    for (const param of command.parameters) {
                        const required = param.required ? '✅ Required' : '❌ Optional';
                        markdown += `- **${param.name}** (${param.type}) - ${required}\n`;
                        markdown += `  - ${param.description}\n`;
                    }
                    markdown += '\n';
                }
                
                if (command.examples.length > 0) {
                    markdown += `**Examples:**\n\n`;
                    for (const example of command.examples) {
                        markdown += `- \`${example.command}\` - ${example.description}\n`;
                    }
                    markdown += '\n';
                }
                
                markdown += `**Permissions:** ${command.permissions.join(', ')}\n\n`;
                markdown += `---\n\n`;
            }
        }

        await fs.writeFile(
            path.join(this.outputDir, 'commands.md'),
            markdown
        );
        console.log('  ✅ Created commands.md');
    }

    async generateHTML() {
        console.log('🌐 Generating HTML documentation...');
        
        // Generate user documentation (public commands only)
        const userCommands = this.commands.filter(cmd => !cmd.adminOnly);
        const userHtml = this.createHTMLTemplate(userCommands, 'user');
        
        await fs.writeFile(
            path.join(this.outputDir, 'commands.html'),
            userHtml
        );
        console.log('  ✅ Created commands.html (User Documentation)');
        
        // Generate admin documentation (all commands)
        const adminHtml = this.createHTMLTemplate(this.commands, 'admin');
        
        await fs.writeFile(
            path.join(this.outputDir, 'admin-commands.html'),
            adminHtml
        );
        console.log('  ✅ Created admin-commands.html (Admin Documentation)');
    }

    createHTMLTemplate(commands = this.commands, role = 'user') {
        const isAdmin = role === 'admin';
        const commandList = commands || this.commands;
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EFD Discord Bot Commands</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style>
        :root {
            --primary-color: #667eea;
            --primary-dark: #5a6fd8;
            --secondary-color: #764ba2;
            --accent-color: #4facfe;
            --success-color: #38a169;
            --warning-color: #d69e2e;
            --error-color: #e53e3e;
            --text-primary: #1a202c;
            --text-secondary: #4a5568;
            --text-muted: #718096;
            --bg-primary: #ffffff;
            --bg-secondary: #f7fafc;
            --bg-sidebar: #2d3748;
            --bg-sidebar-hover: #4a5568;
            --border-color: #e2e8f0;
            --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: var(--bg-secondary);
            color: var(--text-primary);
            line-height: 1.6;
            display: flex;
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Sidebar Styles */
        .sidebar {
            width: 280px;
            background: var(--bg-sidebar);
            color: white;
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: var(--shadow-xl);
            transform: translateX(0);
            transition: transform 0.3s ease-in-out;
        }

        .sidebar.hidden {
            transform: translateX(-100%);
        }

        .sidebar-header {
            padding: 24px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        }

        .sidebar-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .sidebar-subtitle {
            font-size: 14px;
            opacity: 0.8;
            font-weight: 400;
        }

        .sidebar-search {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .search-container {
            position: relative;
        }

        .search-input {
            width: 100%;
            padding: 12px 16px 12px 44px;
            border: none;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 14px;
            transition: all 0.2s ease;
        }

        .search-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }

        .search-input:focus {
            outline: none;
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
        }

        .search-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.6;
            font-size: 18px;
        }

        .sidebar-stats {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 12px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-number {
            font-size: 24px;
            font-weight: 700;
            color: var(--accent-color);
        }

        .stat-label {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 4px;
        }

        .sidebar-nav {
            padding: 8px 0;
        }

        .nav-section {
            margin-bottom: 8px;
        }

        .nav-section-title {
            padding: 12px 20px 8px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.7;
        }

        .nav-item {
            display: flex;
            align-items: center;
            padding: 12px 20px;
            color: rgba(255, 255, 255, 0.9);
            text-decoration: none;
            transition: all 0.2s ease;
            border-left: 3px solid transparent;
            cursor: pointer;
        }

        .nav-item:hover,
        .nav-item.active {
            background: var(--bg-sidebar-hover);
            border-left-color: var(--accent-color);
            color: white;
        }

        .nav-item .material-icons {
            margin-right: 12px;
            font-size: 20px;
        }

        .nav-item-text {
            flex: 1;
            font-size: 14px;
            font-weight: 500;
        }

        .nav-item-count {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }

        /* Main Content Styles */
        .main-content {
            flex: 1;
            margin-left: 280px;
            transition: margin-left 0.3s ease-in-out;
            min-height: 100vh;
            background: var(--bg-secondary);
        }

        .main-content.expanded {
            margin-left: 0;
        }

        .top-bar {
            background: var(--bg-primary);
            padding: 16px 24px;
            border-bottom: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .menu-toggle {
            display: none;
            background: none;
            border: none;
            color: var(--text-primary);
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: background 0.2s ease;
        }

        .menu-toggle:hover {
            background: var(--bg-secondary);
        }

        .breadcrumb {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
            font-size: 14px;
        }

        .content-area {
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .page-header {
            margin-bottom: 32px;
        }

        .page-title {
            font-size: 32px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .page-description {
            font-size: 16px;
            color: var(--text-secondary);
        }

        /* Command Cards */
        .commands-container {
            display: none;
        }

        .commands-container.active {
            display: block;
        }

        .category-section {
            margin-bottom: 48px;
        }

        .category-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            padding: 16px 0;
            border-bottom: 2px solid var(--border-color);
        }

        .category-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
        }

        .category-info h2 {
            font-size: 24px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 4px;
        }

        .category-meta {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .commands-grid {
            display: grid;
            gap: 20px;
        }

        .command-card {
            background: var(--bg-primary);
            border-radius: 12px;
            padding: 24px;
            box-shadow: var(--shadow-md);
            transition: all 0.3s ease;
            border: 1px solid var(--border-color);
        }

        .command-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
            border-color: var(--primary-color);
        }

        .command-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 16px;
        }

        .command-name {
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-size: 18px;
            font-weight: 600;
            color: var(--primary-color);
            background: rgba(102, 126, 234, 0.1);
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .command-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .badge {
            padding: 4px 10px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge.admin { background: rgba(214, 158, 46, 0.1); color: var(--warning-color); border: 1px solid rgba(214, 158, 46, 0.2); }
        .badge.public { background: rgba(56, 161, 105, 0.1); color: var(--success-color); border: 1px solid rgba(56, 161, 105, 0.2); }
        .badge.guild { background: rgba(128, 90, 213, 0.1); color: #805ad5; border: 1px solid rgba(128, 90, 213, 0.2); }

        .command-description {
            font-size: 16px;
            color: var(--text-primary);
            margin-bottom: 20px;
            line-height: 1.6;
        }

        .command-section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .parameters-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .parameter {
            background: var(--bg-secondary);
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 4px solid var(--primary-color);
        }

        .parameter-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
        }

        .parameter-name {
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .parameter-type {
            font-size: 12px;
            color: var(--text-muted);
            background: rgba(113, 128, 150, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
        }

        .parameter-description {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .examples-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .example {
            background: #1a202c;
            color: #e2e8f0;
            padding: 16px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            position: relative;
            overflow-x: auto;
        }

        .example-command {
            font-size: 14px;
            margin-bottom: 8px;
            color: #68d391;
        }

        .example-description {
            font-size: 12px;
            color: #a0aec0;
            font-family: 'Inter', sans-serif;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 64px 24px;
            color: var(--text-secondary);
        }

        .empty-state .material-icons {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.3;
        }

        .empty-state h3 {
            font-size: 20px;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
            }

            .sidebar.visible {
                transform: translateX(0);
            }

            .main-content {
                margin-left: 0;
            }

            .menu-toggle {
                display: block;
            }

            .content-area {
                padding: 16px;
            }

            .command-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Smooth scrolling */
        html {
            scroll-behavior: smooth;
        }

        /* Loading states */
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }

        /* Focus styles for accessibility */
        .nav-item:focus,
        .search-input:focus,
        .menu-toggle:focus {
            outline: 2px solid var(--accent-color);
            outline-offset: 2px;
        }
    </style>
</head>
<body>
    <!-- Sidebar -->
    <nav class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="sidebar-title">
                <span class="material-icons">${isAdmin ? 'admin_panel_settings' : 'smart_toy'}</span>
                EFD Bot ${isAdmin ? 'Admin' : 'Commands'}
            </div>
            <div class="sidebar-subtitle">${isAdmin ? 'Administrator Documentation' : 'User Command Documentation'}</div>
        </div>
        
        <div class="sidebar-search">
            <div class="search-container">
                <span class="material-icons search-icon">search</span>
                <input type="text" class="search-input" placeholder="Search commands..." id="searchInput">
            </div>
        </div>
        
        <div class="sidebar-stats">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${commandList.length}</div>
                    <div class="stat-label">Commands</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${[...new Set(commandList.map(cmd => cmd.category))].length}</div>
                    <div class="stat-label">Categories</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${commandList.filter(cmd => cmd.adminOnly).length}</div>
                    <div class="stat-label">Admin Only</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${commandList.filter(cmd => !cmd.adminOnly).length}</div>
                    <div class="stat-label">Public</div>
                </div>
            </div>
        </div>
        
        <div class="sidebar-nav">
            <div class="nav-section">
                <div class="nav-section-title">Overview</div>
                <div class="nav-item active" data-section="overview">
                    <span class="material-icons">dashboard</span>
                    <span class="nav-item-text">All Commands</span>
                    <span class="nav-item-count">${commandList.length}</span>
                </div>
            </div>
            
            <div class="nav-section">
                <div class="nav-section-title">Categories</div>
                ${this.generateSidebarCategories(commandList)}
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content" id="mainContent">
        <div class="top-bar">
            <div style="display: flex; align-items: center; gap: 16px;">
                <button class="menu-toggle" id="menuToggle">
                    <span class="material-icons">menu</span>
                </button>
                <div class="breadcrumb">
                    <span class="material-icons">home</span>
                    <span>Documentation</span>
                    <span class="material-icons">chevron_right</span>
                    <span id="currentSection">All Commands</span>
                </div>
            </div>
            <div style="font-size: 14px; color: var(--text-secondary);">
                Generated on ${new Date().toLocaleDateString()}
            </div>
        </div>
        
        <div class="content-area">
            <div class="page-header">
                <h1 class="page-title" id="pageTitle">${isAdmin ? 'Admin' : 'Discord Bot'} Commands</h1>
                <p class="page-description" id="pageDescription">
                    ${isAdmin ? 
                        'Administrator documentation for all available Discord commands. Includes both public and admin-only commands.' : 
                        'User documentation for available Discord commands. Public commands only.'
                    }
                </p>
            </div>
            
            <!-- Role Toggle -->
            <div style="margin-bottom: 24px; padding: 16px; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 16px; justify-content: space-between; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span style="font-weight: 600; color: var(--text-primary);">Documentation View:</span>
                        <div style="display: flex; gap: 8px;">
                            <a href="${isAdmin ? '/api/docs/' : '/api/docs/'}" 
                               style="padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500; transition: all 0.2s ease; ${!isAdmin ? 'background: var(--primary-color); color: white;' : 'background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border-color);'}"
                               onmouseover="this.style.transform='translateY(-1px)'"
                               onmouseout="this.style.transform='translateY(0)'">
                                <span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 6px;">people</span>
                                User Commands
                            </a>
                            <a href="${isAdmin ? '/api/docs/admin/' : '/api/docs/admin/'}" 
                               style="padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500; transition: all 0.2s ease; ${isAdmin ? 'background: var(--warning-color); color: white;' : 'background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border-color);'}"
                               onmouseover="this.style.transform='translateY(-1px)'"
                               onmouseout="this.style.transform='translateY(0)'">
                                <span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 6px;">admin_panel_settings</span>
                                Admin Commands
                            </a>
                        </div>
                    </div>
                    <div style="font-size: 14px; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="font-size: 16px;">${isAdmin ? 'warning' : 'info'}</span>
                        ${isAdmin ? 'Showing all commands including admin-only' : 'Showing public commands only'}
                    </div>
                </div>
            </div>
            
            <!-- Overview Section -->
            <div class="commands-container active" id="overview">
                ${this.generateModernHTMLCommands(commandList)}
            </div>
            
            <!-- Category Sections -->
            ${this.generateCategorySections(commandList)}
            
            <!-- Empty State -->
            <div class="empty-state" id="emptyState" style="display: none;">
                <span class="material-icons">search_off</span>
                <h3>No commands found</h3>
                <p>Try adjusting your search terms or browse by category.</p>
            </div>
        </div>
    </main>
    
    <script>
        // Modern sidebar and navigation functionality
        document.addEventListener('DOMContentLoaded', function() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const menuToggle = document.getElementById('menuToggle');
            const searchInput = document.getElementById('searchInput');
            const navItems = document.querySelectorAll('.nav-item');
            const commandContainers = document.querySelectorAll('.commands-container');
            const emptyState = document.getElementById('emptyState');
            const pageTitle = document.getElementById('pageTitle');
            const pageDescription = document.getElementById('pageDescription');
            const currentSection = document.getElementById('currentSection');

            // Mobile menu toggle
            menuToggle.addEventListener('click', function() {
                sidebar.classList.toggle('visible');
                if (window.innerWidth <= 768) {
                    mainContent.classList.toggle('expanded');
                }
            });

            // Navigation
            navItems.forEach(item => {
                item.addEventListener('click', function() {
                    const section = this.dataset.section;
                    
                    // Update active states
                    navItems.forEach(nav => nav.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Show/hide sections
                    commandContainers.forEach(container => {
                        container.classList.remove('active');
                    });
                    
                    const targetContainer = document.getElementById(section);
                    if (targetContainer) {
                        targetContainer.classList.add('active');
                        
                        // Update page header
                        if (section === 'overview') {
                            pageTitle.textContent = 'Discord Bot Commands';
                            pageDescription.textContent = 'Comprehensive documentation for all available Discord commands. Use the sidebar to browse by category or search for specific commands.';
                            currentSection.textContent = 'All Commands';
                        } else {
                            const categoryName = section.charAt(0).toUpperCase() + section.slice(1);
                            pageTitle.textContent = categoryName + ' Commands';
                            pageDescription.textContent = 'Commands in the ' + categoryName + ' category.';
                            currentSection.textContent = categoryName;
                        }
                    }
                    
                    // Hide mobile sidebar after selection
                    if (window.innerWidth <= 768) {
                        sidebar.classList.remove('visible');
                    }
                });
            });

            // Enhanced search functionality
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const searchTerm = this.value.toLowerCase().trim();
                    const allCommands = document.querySelectorAll('.command-card');
                    const categories = document.querySelectorAll('.category-section');
                    let visibleCount = 0;

                    if (searchTerm === '') {
                        // Show all commands
                        allCommands.forEach(command => {
                            command.style.display = 'block';
                            visibleCount++;
                        });
                        categories.forEach(category => {
                            category.style.display = 'block';
                        });
                        emptyState.style.display = 'none';
                    } else {
                        // Filter commands
                        allCommands.forEach(command => {
                            const text = command.textContent.toLowerCase();
                            const isVisible = text.includes(searchTerm);
                            command.style.display = isVisible ? 'block' : 'none';
                            if (isVisible) visibleCount++;
                        });

                        // Hide empty categories
                        categories.forEach(category => {
                            const visibleCommands = category.querySelectorAll('.command-card[style*="block"], .command-card:not([style])');
                            category.style.display = visibleCommands.length > 0 ? 'block' : 'none';
                        });

                        // Show empty state if no results
                        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
                    }

                    // Update page title with search results
                    if (searchTerm && visibleCount > 0) {
                        pageTitle.textContent = 'Search Results (' + visibleCount + ')';
                        pageDescription.textContent = 'Commands matching "' + searchTerm + '"';
                        currentSection.textContent = 'Search Results';
                    } else if (searchTerm && visibleCount === 0) {
                        pageTitle.textContent = 'No Results';
                        pageDescription.textContent = 'No commands found matching "' + searchTerm + '"';
                        currentSection.textContent = 'Search Results';
                    }
                }, 300);
            });

            // Responsive handling
            function handleResize() {
                if (window.innerWidth > 768) {
                    sidebar.classList.remove('visible');
                    mainContent.classList.remove('expanded');
                } else {
                    sidebar.classList.remove('visible');
                }
            }

            window.addEventListener('resize', handleResize);
            handleResize();

            // Smooth scrolling for anchor links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });

            // Add keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                // Focus search with Ctrl+K or Cmd+K
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    searchInput.focus();
                }
                
                // Close sidebar with Escape
                if (e.key === 'Escape') {
                    sidebar.classList.remove('visible');
                }
            });
        });
    </script>
</body>
</html>`;
    }

    generateHTMLCommands() {
        const categories = [...new Set(this.commands.map(cmd => cmd.category))];
        
        return categories.map(category => {
            const categoryCommands = this.commands.filter(cmd => cmd.category === category);
            
            return `
                <div class="category">
                    <h2>${category} Commands (${categoryCommands.length})</h2>
                    ${categoryCommands.map(command => this.generateHTMLCommand(command)).join('')}
                </div>
            `;
        }).join('');
    }

    generateHTMLCommand(command) {
        return `
            <div class="command">
                <h3><span class="command-name">/${command.name}</span></h3>
                <p>${command.description}</p>
                
                <div style="margin: 15px 0;">
                    ${command.adminOnly ? '<span class="badge admin">Admin Only</span>' : ''}
                    ${command.guildOnly ? '<span class="badge guild">Guild Only</span>' : ''}
                    ${command.permissions.includes('Everyone') ? '<span class="badge optional">Public</span>' : ''}
                </div>
                
                ${command.parameters.length > 0 ? `
                    <h4>Parameters:</h4>
                    ${command.parameters.map(param => `
                        <div class="parameter">
                            <strong>${param.name}</strong> (${param.type})
                            <span class="badge ${param.required ? 'required' : 'optional'}">
                                ${param.required ? 'Required' : 'Optional'}
                            </span>
                            <br><small>${param.description}</small>
                        </div>
                    `).join('')}
                ` : ''}
                
                ${command.examples.length > 0 ? `
                    <h4>Examples:</h4>
                    ${command.examples.map(example => `
                        <div class="example">
                            ${example.command}
                            <br><small style="opacity: 0.8;">${example.description}</small>
                        </div>
                    `).join('')}
                ` : ''}
                
                <p><strong>Permissions:</strong> ${command.permissions.join(', ')}</p>
            </div>
        `;
    }

    generateSidebarCategories(commands = this.commands) {
        const categories = [...new Set(commands.map(cmd => cmd.category))];
        const categoryIcons = {
            'Utility': 'build',
            'Admin': 'admin_panel_settings',
            'Fun': 'celebration',
            'Currency': 'paid',
            'GEMS': 'diamond',
            'Moderation': 'gavel',
            'Social': 'people',
            'Economy': 'account_balance',
            'General': 'apps',
            'Music': 'music_note',
            'Games': 'sports_esports',
            'Information': 'info'
        };

        return categories.map(category => {
            const commandCount = commands.filter(cmd => cmd.category === category).length;
            const icon = categoryIcons[category] || 'folder';
            const categoryId = category.toLowerCase().replace(/\s+/g, '-');
            
            return `
                <div class="nav-item" data-section="${categoryId}">
                    <span class="material-icons">${icon}</span>
                    <span class="nav-item-text">${category}</span>
                    <span class="nav-item-count">${commandCount}</span>
                </div>
            `;
        }).join('');
    }

    generateCategorySections(commands = this.commands) {
        const categories = [...new Set(commands.map(cmd => cmd.category))];
        const categoryIcons = {
            'Utility': 'build',
            'Admin': 'admin_panel_settings', 
            'Fun': 'celebration',
            'Currency': 'paid',
            'GEMS': 'diamond',
            'Moderation': 'gavel',
            'Social': 'people',
            'Economy': 'account_balance',
            'General': 'apps',
            'Music': 'music_note',
            'Games': 'sports_esports',
            'Information': 'info'
        };

        return categories.map(category => {
            const categoryCommands = commands.filter(cmd => cmd.category === category);
            const icon = categoryIcons[category] || 'folder';
            const categoryId = category.toLowerCase().replace(/\s+/g, '-');
            
            return `
                <div class="commands-container" id="${categoryId}">
                    <div class="category-section">
                        <div class="category-header">
                            <div class="category-icon">
                                <span class="material-icons">${icon}</span>
                            </div>
                            <div class="category-info">
                                <h2>${category}</h2>
                                <div class="category-meta">${categoryCommands.length} command${categoryCommands.length !== 1 ? 's' : ''}</div>
                            </div>
                        </div>
                        <div class="commands-grid">
                            ${categoryCommands.map(command => this.generateModernCommandCard(command)).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    generateModernHTMLCommands(commands = this.commands) {
        const categories = [...new Set(commands.map(cmd => cmd.category))];
        const categoryIcons = {
            'Utility': 'build',
            'Admin': 'admin_panel_settings',
            'Fun': 'celebration', 
            'Currency': 'paid',
            'GEMS': 'diamond',
            'Moderation': 'gavel',
            'Social': 'people',
            'Economy': 'account_balance',
            'General': 'apps',
            'Music': 'music_note',
            'Games': 'sports_esports',
            'Information': 'info'
        };

        return categories.map(category => {
            const categoryCommands = commands.filter(cmd => cmd.category === category);
            const icon = categoryIcons[category] || 'folder';
            
            return `
                <div class="category-section">
                    <div class="category-header">
                        <div class="category-icon">
                            <span class="material-icons">${icon}</span>
                        </div>
                        <div class="category-info">
                            <h2>${category}</h2>
                            <div class="category-meta">${categoryCommands.length} command${categoryCommands.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div class="commands-grid">
                        ${categoryCommands.map(command => this.generateModernCommandCard(command)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    generateModernCommandCard(command) {
        const adminBadge = command.adminOnly ? '<span class="badge admin">Admin Only</span>' : '<span class="badge public">Public</span>';
        const guildBadge = command.guildOnly ? '<span class="badge guild">Guild Only</span>' : '';
        
        const parameters = command.parameters && command.parameters.length > 0 ? `
            <div class="command-section">
                <div class="section-title">Parameters</div>
                <div class="parameters-list">
                    ${command.parameters.map(param => `
                        <div class="parameter">
                            <div class="parameter-header">
                                <span class="parameter-name">${param.name}</span>
                                <span class="parameter-type">${param.type}</span>
                            </div>
                            <div class="parameter-description">${param.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const examples = command.examples && command.examples.length > 0 ? `
            <div class="command-section">
                <div class="section-title">Examples</div>
                <div class="examples-list">
                    ${command.examples.map(example => `
                        <div class="example">
                            <div class="example-command">/${command.name} ${example.usage || ''}</div>
                            <div class="example-description">${example.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        return `
            <div class="command-card">
                <div class="command-header">
                    <div class="command-name">/${command.name}</div>
                    <div class="command-badges">
                        ${adminBadge}
                        ${guildBadge}
                    </div>
                </div>
                <div class="command-description">${command.description}</div>
                ${parameters}
                ${examples}
            </div>
        `;
    }
}

async function main() {
    try {
        const generator = new CommandDocsGenerator();
        await generator.generateDocs();
        
        console.log('\n🎉 Documentation generation completed!');
        console.log('\n📂 Generated files:');
        console.log('  ├── docs/api/commands.json (API data)');
        console.log('  ├── docs/api/commands.md (Markdown)');
        console.log('  └── docs/api/commands.html (Interactive HTML)');
        
    } catch (error) {
        console.error('❌ Failed to generate documentation:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { CommandDocsGenerator };