// clear-verification.js
// Quick script to clear verification data for a specific user
import { db } from './src/lib/database.js';

async function clearVerification(discordId) {
    try {
        await db.connect();
        const users = await db.discordUsers();
        
        console.log('🔍 Looking for user with Discord ID:', discordId);
        
        // Find the user first
        const existingUser = await users.findOne({ discordId: discordId });
        
        if (existingUser) {
            console.log('📋 Found user data:');
            console.log('  - Type:', existingUser.type);
            console.log('  - Role:', existingUser.role || 'N/A');
            console.log('  - Verified at:', existingUser.verifiedAt);
            
            // Delete the user
            const result = await users.deleteOne({ discordId: discordId });
            
            if (result.deletedCount > 0) {
                console.log('✅ Successfully cleared verification data!');
                console.log('You can now run /verify again.');
            } else {
                console.log('❌ Failed to delete verification data.');
            }
        } else {
            console.log('❌ No verification data found for this Discord ID.');
        }
        
    } catch (error) {
        console.error('❌ Error clearing verification:', error);
    } finally {
        process.exit(0);
    }
}

// Replace with your Discord ID
const DISCORD_ID = 'YOUR_DISCORD_ID_HERE';

console.log('🚀 Starting verification cleanup...');
clearVerification(DISCORD_ID);