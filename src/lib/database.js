// lib/database.js
import { MongoClient } from "mongodb";
import Constants from "./constants.js";

class Database {
    constructor() {
        if (!Database.instance) {
            // Use HMR-friendly approach from Vercel example
            if (process.env.NODE_ENV === "development") {
                // In development mode, use a global variable for HMR compatibility
                let globalWithMongo = global;
                if (!globalWithMongo._mongoClient) {
                    globalWithMongo._mongoClient = new MongoClient(process.env.MONGODB_URI, {
                        minPoolSize: 5,
                        maxPoolSize: 10,
                    });
                }
                this.client = globalWithMongo._mongoClient;
            } else {
                // In production mode, create a new client
                this.client = new MongoClient(process.env.MONGODB_URI, {
                    minPoolSize: 5,
                    maxPoolSize: 10,
                });
            }
            this._instance = null;
            Database.instance = this;
        }
        return Database.instance;
    }

    async connect() {
        if (!this._instance) {
            try {
                console.log("🔄 Attempting MongoDB connection...");
                await this.client.connect();
                console.log("✅ MongoDB Connected");
                this._instance = this.client.db(process.env.MONGO_DB_NAME || "efd-database");
            } catch (error) {
                console.error("❌ MongoDB Connection Error:", error.message);
                // Try alternative connection string without directConnection
                if (error.message.includes('Server selection timed out')) {
                    console.log("🔄 Retrying with alternative connection settings...");
                    try {
                        // Create new client with different settings
                        const altClient = new MongoClient(process.env.MONGODB_URI.replace('directConnection=true&', ''), {
                            minPoolSize: 2,
                            maxPoolSize: 5,
                            serverSelectionTimeoutMS: 15000,
                            connectTimeoutMS: 15000,
                        });
                        await altClient.connect();
                        console.log("✅ MongoDB Connected (alternative settings)");
                        this.client = altClient;
                        this._instance = this.client.db(process.env.MONGO_DB_NAME || "efd-database");
                    } catch (altError) {
                        console.error("❌ Alternative MongoDB Connection Also Failed:", altError.message);
                        throw new Error("Failed to connect to MongoDB");
                    }
                } else {
                    throw new Error("Failed to connect to MongoDB");
                }
            }
        }
        return this._instance;
    }

    getDb() {
        if (!this._instance) throw new Error("Database not initialized");
        return this._instance;
    }

    // Core Collections
    async dbUsers() {
        await this.connect();
        return this._instance.collection(Constants.USERS_COLLECTION);
    }

    async dbDiscordUsers() {
        await this.connect();
        return this._instance.collection(Constants.DISCORD_USERS_COLLECTION);
    }

    async dbRepairs() {
        await this.connect();
        return this._instance.collection(Constants.REPAIRS_COLLECTION);
    }

    async dbTasks() {
        await this.connect();
        return this._instance.collection(Constants.TASKS_COLLECTION);
    }

    async dbMaterials() {
        await this.connect();
        return this._instance.collection(Constants.MATERIALS_COLLECTION);
    }

    async dbProcesses() {
        await this.connect();
        return this._instance.collection(Constants.PROCESSES_COLLECTION);
    }

    // Admin Collections
    async dbAdminSettings() {
        await this.connect();
        return this._instance.collection(Constants.ADMIN_SETTINGS_COLLECTION);
    }

    async dbAdminSettingsAudit() {
        await this.connect();
        return this._instance.collection(Constants.ADMIN_SETTINGS_AUDIT_COLLECTION);
    }

    // Additional Collections
    async dbCollectors() {
        await this.connect();
        return this._instance.collection(Constants.COLLECTORS_COLLECTION);
    }

    async dbContactRequests() {
        await this.connect();
        return this._instance.collection(Constants.CONTACT_REQUESTS_COLLECTION);
    }

    async dbCustomTickets() {
        await this.connect();
        return this._instance.collection(Constants.CUSTOM_TICKETS_COLLECTION);
    }

    async dbInventory() {
        await this.connect();
        return this._instance.collection(Constants.INVENTORY_COLLECTION);
    }
    
    // Roadmap Collections
    async dbRoadmapPhases() {
        await this.connect();
        return this._instance.collection(Constants.ROADMAP_PHASES_COLLECTION);
    }
    
    async dbRoadmapTasks() {
        await this.connect();
        return this._instance.collection(Constants.ROADMAP_TASKS_COLLECTION);
    }
    
    async dbRoadmapUpdates() {
        await this.connect();
        return this._instance.collection(Constants.ROADMAP_UPDATES_COLLECTION);
    }

    // GEMS Collections
    async dbGemsBalances() {
        await this.connect();
        return this._instance.collection(Constants.GEMS_BALANCES_COLLECTION);
    }

    async dbGemsTransactions() {
        await this.connect();
        return this._instance.collection(Constants.GEMS_TRANSACTIONS_COLLECTION);
    }

    async dbGemsSettings() {
        await this.connect();
        return this._instance.collection(Constants.GEMS_SETTINGS_COLLECTION);
    }

    // GEMS Database Initialization
    async initializeGemsCollections() {
        await this.connect();
        
        try {
            // Create indexes for gems_balances collection
            const balancesCollection = await this.dbGemsBalances();
            await balancesCollection.createIndex({ discordId: 1 }, { unique: true });
            await balancesCollection.createIndex({ balance: -1 }); // For leaderboards
            await balancesCollection.createIndex({ lifetimeEarned: -1 }); // For top earners
            await balancesCollection.createIndex({ lastActivity: -1 }); // For activity tracking
            
            // Create indexes for gems_transactions collection
            const transactionsCollection = await this.dbGemsTransactions();
            await transactionsCollection.createIndex({ discordId: 1, timestamp: -1 }); // User transaction history
            await transactionsCollection.createIndex({ type: 1, timestamp: -1 }); // Transaction type queries
            await transactionsCollection.createIndex({ source: 1, timestamp: -1 }); // Source tracking
            await transactionsCollection.createIndex({ timestamp: -1 }); // Recent transactions
            await transactionsCollection.createIndex({ relatedUserId: 1 }, { sparse: true }); // For tips/transfers
            
            // Create indexes for gems_settings collection
            const settingsCollection = await this.dbGemsSettings();
            await settingsCollection.createIndex({ settingKey: 1 }, { unique: true });
            await settingsCollection.createIndex({ category: 1 }); // Settings by category
            
            console.log("✅ GEMS collection indexes created successfully");
            
            // Initialize default settings if they don't exist
            await this.initializeGemsDefaultSettings();
            
        } catch (error) {
            console.error("❌ Error initializing GEMS collections:", error);
            throw error;
        }
    }
    
    async initializeGemsDefaultSettings() {
        const settingsCollection = await this.dbGemsSettings();
        
        for (const [key, config] of Object.entries(Constants.GEMS_DEFAULT_SETTINGS)) {
            const existingSetting = await settingsCollection.findOne({ settingKey: key });
            
            if (!existingSetting) {
                await settingsCollection.insertOne({
                    settingKey: key,
                    value: config.value,
                    description: config.description,
                    category: config.category,
                    updatedBy: 'system',
                    updatedAt: new Date()
                });
            }
        }
        
        console.log("✅ GEMS default settings initialized");
    }

    // Legacy alias for backward compatibility
    async dbRepairTasks() {
        await this.connect();
        return this._instance.collection(Constants.REPAIRTASKS_COLLECTION);
    }
}

// Create database instance only when needed to avoid environment variable issues
let dbInstance = null;

export const db = {
    get instance() {
        if (!dbInstance) {
            dbInstance = new Database();
        }
        return dbInstance;
    },
    
    async database() {
        return await this.instance.connect();
    },
    
    async connect() {
        return await this.instance.connect();
    },
    
    async users() {
        return await this.instance.dbUsers();
    },
    
    async discordUsers() {
        return await this.instance.dbDiscordUsers();
    },
    
    async collectors() {
        return await this.instance.dbCollectors();
    },
    
    async repairs() {
        return await this.instance.dbRepairs();
    },
    
    async tasks() {
        return await this.instance.dbTasks();
    },
    
    async materials() {
        return await this.instance.dbMaterials();
    },
    
    async processes() {
        return await this.instance.dbProcesses();
    },
    
    async contactRequests() {
        return await this.instance.dbContactRequests();
    },
    
    async customTickets() {
        return await this.instance.dbCustomTickets();
    },
    
    async inventory() {
        return await this.instance.dbInventory();
    },
    
    async adminSettings() {
        return await this.instance.dbAdminSettings();
    },
    
    async adminSettingsAudit() {
        return await this.instance.dbAdminSettingsAudit();
    },
    
    async dbRepairTasks() {
        return await this.instance.dbRepairTasks();
    },
    
    // Roadmap Collections
    async roadmapPhases() {
        return await this.instance.dbRoadmapPhases();
    },
    
    async roadmapTasks() {
        return await this.instance.dbRoadmapTasks();
    },
    
    async roadmapUpdates() {
        return await this.instance.dbRoadmapUpdates();
    },
    
    // GEMS Collections
    async gemsBalances() {
        return await this.instance.dbGemsBalances();
    },
    
    async gemsTransactions() {
        return await this.instance.dbGemsTransactions();
    },
    
    async gemsSettings() {
        return await this.instance.dbGemsSettings();
    },
    
    // GEMS Initialization
    async initializeGems() {
        return await this.instance.initializeGemsCollections();
    }
};
