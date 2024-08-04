const { MongoClient } = require('mongodb');
require('dotenv').config(); 

const DATABASE = process.env.DATABASE;

let dbConnection;

const connectToDb = async () => {
    try {
        const client = await MongoClient.connect(DATABASE, { useNewUrlParser: true, useUnifiedTopology: true });
        dbConnection = client.db('cryptoWallets'); 
        console.log('Connected to database');
    } catch (err) {
        console.error('Error connecting to database:', err);
        throw err;
    }
};

const getDb = () => {
    if (!dbConnection) {
        throw new Error('Database not connected');
    }
    return dbConnection;
};

module.exports = { connectToDb, getDb };
