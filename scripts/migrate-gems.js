#!/usr/bin/env node

/**
 * GEMS Migration Script
 * 
 * This script initializes the GEMS currency system by:
 * 1. Creating necessary database collections and indexes
 * 2. Migrating existing verified users to GEMS system
 * 3. Granting retroactive verification rewards
 * 4. Setting up default balances for all users
 * 
 * Usage: node scripts/migrate-gems.js
 */

import { config } from 'dotenv';
import { db } from '../src/lib/database.js';
import Constants from '../src/lib/constants.js';

// Load environment variables
config();

class GemsMigration {
    constructor() {
        this.dryRun = process.argv.includes('--dry-run');
        this.verbose = process.argv.includes('--verbose');
        this.stats = {
            usersProcessed: 0,
            balancesCreated: 0,
            retroactiveRewards: 0,
            errors: 0
        };
    }

    log(message) {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }

    verbose(message) {
        if (this.verbose) {
            console.log(`[VERBOSE] ${message}`);
        }
    }

    async run() {
        try {
            this.log('🚀 Starting GEMS migration...');
            
            if (this.dryRun) {
                this.log('🧪 DRY RUN MODE - No changes will be made');
            }

            // Step 1: Initialize GEMS collections and indexes
            await this.initializeCollections();

            // Step 2: Process existing users
            await this.migrateExistingUsers();

            // Step 3: Grant retroactive rewards
            await this.grantRetroactiveRewards();

            // Step 4: Validation
            await this.validateMigration();

            this.log('✅ GEMS migration completed successfully!');
            this.printStats();

        } catch (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        } finally {
            // Close database connection
            if (db.instance?._instance?.client) {
                await db.instance.client.close();
            }
            process.exit(0);
        }
    }

    async initializeCollections() {
        this.log('📊 Initializing GEMS collections and indexes...');
        
        if (!this.dryRun) {
            await db.initializeGems();
        }
        
        this.log('✅ Collections initialized');
    }

    async migrateExistingUsers() {
        this.log('👥 Processing existing users...');
        
        const usersCollection = await db.users();
        const balancesCollection = await db.gemsBalances();
        
        // Get all users with Discord IDs
        const users = await usersCollection.find({ 
            discordId: { $exists: true, $ne: null } 
        }).toArray();
        
        this.log(`Found ${users.length} users to process`);

        for (const user of users) {
            try {
                this.stats.usersProcessed++;
                
                // Check if balance already exists
                const existingBalance = await balancesCollection.findOne({ 
                    discordId: user.discordId 
                });
                
                if (existingBalance) {
                    this.verbose(`Skipping ${user.discordId} - balance already exists`);
                    continue;
                }

                // Create initial balance
                const initialBalance = {
                    discordId: user.discordId,
                    balance: 0,
                    lifetimeEarned: 0,
                    lifetimeSpent: 0,
                    lastActivity: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                if (!this.dryRun) {
                    await balancesCollection.insertOne(initialBalance);
                }
                
                this.stats.balancesCreated++;
                this.verbose(`Created balance for user ${user.discordId}`);

            } catch (error) {
                console.error(`Error processing user ${user.discordId}:`, error);
                this.stats.errors++;
            }
        }
        
        this.log(`✅ Processed ${this.stats.usersProcessed} users, created ${this.stats.balancesCreated} balances`);
    }

    async grantRetroactiveRewards() {
        this.log('🎁 Granting retroactive verification rewards...');
        
        const usersCollection = await db.users();
        const balancesCollection = await db.gemsBalances();
        const transactionsCollection = await db.gemsTransactions();
        
        // Find all verified users
        const verifiedUsers = await usersCollection.find({
            discordId: { $exists: true, $ne: null },
            $or: [
                { isVerifiedJeweler: true },
                { isVerifiedLapidarist: true },
                { isVerifiedCADDesigner: true },
                { isVerifiedDealer: true },
                { isVerifiedCollector: true }
            ]
        }).toArray();
        
        this.log(`Found ${verifiedUsers.length} verified users for retroactive rewards`);

        for (const user of verifiedUsers) {
            try {
                let rewardAmount = 0;
                let rewardReasons = [];

                // Calculate rewards based on verification types
                if (user.isVerifiedCollector) {
                    rewardAmount += 500; // Jewelry verification reward
                    rewardReasons.push('jewelry verification');
                }
                
                if (user.isVerifiedJeweler || user.isVerifiedLapidarist || 
                    user.isVerifiedCADDesigner || user.isVerifiedDealer) {
                    rewardAmount += 100; // Industry verification reward
                    rewardReasons.push('industry verification');
                }

                if (rewardAmount > 0) {
                    if (!this.dryRun) {
                        // Update balance
                        await balancesCollection.updateOne(
                            { discordId: user.discordId },
                            { 
                                $inc: { 
                                    balance: rewardAmount,
                                    lifetimeEarned: rewardAmount
                                },
                                $set: { updatedAt: new Date() }
                            }
                        );

                        // Log transaction
                        await transactionsCollection.insertOne({
                            discordId: user.discordId,
                            type: 'earned',
                            amount: rewardAmount,
                            reason: `Retroactive verification rewards: ${rewardReasons.join(', ')}`,
                            source: 'verification',
                            metadata: {
                                migration: true,
                                verificationTypes: rewardReasons
                            },
                            timestamp: new Date()
                        });
                    }
                    
                    this.stats.retroactiveRewards += rewardAmount;
                    this.verbose(`Granted ${rewardAmount} GEMS to ${user.discordId} for ${rewardReasons.join(', ')}`);
                }

            } catch (error) {
                console.error(`Error granting rewards to user ${user.discordId}:`, error);
                this.stats.errors++;
            }
        }
        
        this.log(`✅ Granted ${this.stats.retroactiveRewards} total GEMS in retroactive rewards`);
    }

    async validateMigration() {
        this.log('🔍 Validating migration...');
        
        const balancesCollection = await db.gemsBalances();
        const transactionsCollection = await db.gemsTransactions();
        const settingsCollection = await db.gemsSettings();
        
        // Count balances
        const balanceCount = await balancesCollection.countDocuments();
        
        // Count transactions
        const transactionCount = await transactionsCollection.countDocuments();
        
        // Count settings
        const settingsCount = await settingsCollection.countDocuments();
        
        this.log(`📊 Validation Results:`);
        this.log(`   - ${balanceCount} user balances created`);
        this.log(`   - ${transactionCount} transactions logged`);
        this.log(`   - ${settingsCount} settings configured`);
        
        // Verify indexes exist
        const balanceIndexes = await balancesCollection.indexes();
        const transactionIndexes = await transactionsCollection.indexes();
        const settingsIndexes = await settingsCollection.indexes();
        
        this.log(`   - ${balanceIndexes.length} balance indexes`);
        this.log(`   - ${transactionIndexes.length} transaction indexes`);
        this.log(`   - ${settingsIndexes.length} settings indexes`);
        
        this.log('✅ Migration validation complete');
    }

    printStats() {
        this.log('\n📈 Migration Statistics:');
        this.log(`   Users Processed: ${this.stats.usersProcessed}`);
        this.log(`   Balances Created: ${this.stats.balancesCreated}`);
        this.log(`   Retroactive GEMS Granted: ${this.stats.retroactiveRewards}`);
        this.log(`   Errors: ${this.stats.errors}`);
    }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const migration = new GemsMigration();
    migration.run().catch(console.error);
}

export default GemsMigration;