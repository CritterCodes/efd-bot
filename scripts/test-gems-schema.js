import { config } from 'dotenv';
import { db } from '../src/lib/database.js';

config();

async function testGemsSchema() {
    try {
        console.log('🧪 Testing GEMS database schema...');
        
        // Test database connection
        await db.connect();
        console.log('✅ Database connected');
        
        // Test GEMS collection access
        const balances = await db.gemsBalances();
        console.log('✅ GEMS balances collection accessible');
        
        const transactions = await db.gemsTransactions();
        console.log('✅ GEMS transactions collection accessible');
        
        const settings = await db.gemsSettings();
        console.log('✅ GEMS settings collection accessible');
        
        // Test initialization
        await db.initializeGems();
        console.log('✅ GEMS collections initialized');
        
        // Test settings count
        const settingsCount = await settings.countDocuments();
        console.log(`✅ ${settingsCount} default settings created`);
        
        console.log('🎉 GEMS schema test completed successfully!');
        
    } catch (error) {
        console.error('❌ Schema test failed:', error);
    } finally {
        process.exit(0);
    }
}

testGemsSchema();