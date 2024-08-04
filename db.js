const { MongoClient } = require('mongodb');
let dbConnection;
require("dotenv").config();
const DATABASE = process.env.DATABASE;


const connectToDb = (cb) => {
   

    MongoClient.connect(DATABASE, { useNewUrlParser: true, useUnifiedTopology: true })
        .then((client) => {
            dbConnection = client.db('cryptoWallets');
            cb(null);
        })
        .catch((err) => {
            console.error('Failed to connect to MongoDB:', err);
            cb(err);
        });
};

const getDb = () => dbConnection;

module.exports = { connectToDb, getDb };
