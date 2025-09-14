import { db } from './src/lib/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function setupDatabase() {
  try {
    await db.connect();
    const discordUsers = db.getDb().collection('discordUsers');
    
    // Remove duplicates if they exist
    const pipeline = [
      {
        $group: {
          _id: "$discordId",
          ids: { $push: "$_id" },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ];
    
    const duplicates = await discordUsers.aggregate(pipeline).toArray();
    
    for (const duplicate of duplicates) {
      // Keep the first document, remove the rest
      const idsToRemove = duplicate.ids.slice(1);
      await discordUsers.deleteMany({ _id: { $in: idsToRemove } });
      console.log(`🧹 Removed ${idsToRemove.length} duplicate(s) for discordId: ${duplicate._id}`);
    }
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found');
    }
    
    console.log('🎉 Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error cleaning up database:', error);
  }
  
  process.exit(0);
}

setupDatabase();