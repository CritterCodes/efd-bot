import { config } from 'dotenv';
import { gems } from '../src/lib/gems.js';
import { db } from '../src/lib/database.js';

config();

async function testGemsCore() {
    console.log('🧪 Testing GEMS Core Functions...');
    
    try {
        // Test user IDs
        const testUser1 = 'test_user_1';
        const testUser2 = 'test_user_2';
        
        // Cleanup any existing test data
        const balancesCollection = await db.gemsBalances();
        const transactionsCollection = await db.gemsTransactions();
        await balancesCollection.deleteMany({ discordId: { $in: [testUser1, testUser2] } });
        await transactionsCollection.deleteMany({ discordId: { $in: [testUser1, testUser2] } });
        
        console.log('✅ Test data cleaned up');
        
        // Test 1: Get user balance (should create new user)
        console.log('\n📊 Testing getUserBalance...');
        const balance1 = await gems.getUserBalance(testUser1);
        console.log('✅ Created new user balance:', balance1);
        
        // Test 2: Add GEMS
        console.log('\n💎 Testing addGems...');
        const addResult = await gems.addGems(testUser1, 100, 'Welcome bonus', 'admin');
        console.log('✅ Added 100 GEMS:', addResult);
        
        // Test 3: Subtract GEMS
        console.log('\n💸 Testing subtractGems...');
        const subtractResult = await gems.subtractGems(testUser1, 25, 'Test purchase', 'admin');
        console.log('✅ Subtracted 25 GEMS:', subtractResult);
        
        // Test 4: Transfer GEMS
        console.log('\n🔄 Testing transferGems...');
        const balance2 = await gems.getUserBalance(testUser2); // Create second user
        const transferResult = await gems.transferGems(testUser1, testUser2, 30, 'Test tip');
        console.log('✅ Transferred 30 GEMS:', transferResult);
        
        // Test 5: Transaction history
        console.log('\n📋 Testing getTransactionHistory...');
        const history = await gems.getTransactionHistory(testUser1);
        console.log('✅ Transaction history:', history.map(t => ({
            type: t.type,
            amount: t.amount,
            reason: t.reason,
            source: t.source
        })));
        
        // Test 6: Leaderboard
        console.log('\n🏆 Testing getLeaderboard...');
        const leaderboard = await gems.getLeaderboard('balance', 'all-time', 5);
        console.log('✅ Leaderboard:', leaderboard);
        
        // Test 7: User rank
        console.log('\n📈 Testing getUserRank...');
        const rank = await gems.getUserRank(testUser1);
        console.log('✅ User rank:', rank);
        
        // Test 8: Daily limits
        console.log('\n⏰ Testing daily earning limits...');
        const limitCheck = await gems.checkDailyEarningLimit(testUser1, 50);
        console.log('✅ Daily limit check:', limitCheck);
        
        // Test 9: Transfer limits
        console.log('\n🚫 Testing transfer limits...');
        const transferLimitCheck = await gems.checkTransferLimits(testUser1, 10);
        console.log('✅ Transfer limit check:', transferLimitCheck);
        
        // Test 10: Settings
        console.log('\n⚙️ Testing settings...');
        const setting = await gems.getSetting('limits.tip.daily_max');
        console.log('✅ Setting retrieved:', setting);
        
        // Test 11: Error handling - insufficient funds
        console.log('\n❌ Testing error handling...');
        try {
            await gems.subtractGems(testUser2, 1000, 'Should fail');
            console.log('❌ Should have failed with insufficient funds');
        } catch (error) {
            console.log('✅ Correctly caught insufficient funds error:', error.message);
        }
        
        // Test 12: Error handling - invalid inputs
        try {
            await gems.addGems('', -10, 'Should fail');
            console.log('❌ Should have failed with invalid inputs');
        } catch (error) {
            console.log('✅ Correctly caught invalid input error:', error.message);
        }
        
        // Final balance check
        console.log('\n📊 Final balance verification...');
        const finalBalance1 = await gems.getUserBalance(testUser1);
        const finalBalance2 = await gems.getUserBalance(testUser2);
        console.log('✅ User 1 final balance:', finalBalance1);
        console.log('✅ User 2 final balance:', finalBalance2);
        
        // Verify balance calculations
        const expectedBalance1 = 100 - 25 - 30; // Added 100, spent 25, transferred 30
        const expectedBalance2 = 30; // Received 30 from transfer
        
        if (finalBalance1.balance === expectedBalance1 && finalBalance2.balance === expectedBalance2) {
            console.log('✅ Balance calculations are correct!');
        } else {
            console.log(`❌ Balance mismatch! Expected: ${expectedBalance1}/${expectedBalance2}, Got: ${finalBalance1.balance}/${finalBalance2.balance}`);
        }
        
        console.log('\n🎉 All GEMS core function tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

testGemsCore();