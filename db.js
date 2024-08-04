const { MongoClient } = require('mongodb');
let dbConnection;
require("dotenv").config;
const DATABASE=process.env.DATABASE;

const connectToDb = (cb) => {
    MongoClient.connect(DATABASE, { useNewUrlParser: true, useUnifiedTopology: true })
        .then((client) => {
            dbConnection = client.db('cryptoWallets'); // Замените на имя вашей базы данных
            cb(null);
        })
        .catch((err) => {
            console.log(err);
            cb(err);
        });
};

const getDb = () => dbConnection;

module.exports = { connectToDb, getDb };