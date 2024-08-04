const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');
const fs = require('fs');
const { connectToDb, getDb } = require('./db');
app.use(bodyParser.json());
const cors=require("cors");
const corsOptions ={
    origin:'*',
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200,
}

app.use(cors(corsOptions))

const getRandomWallet = async () => {
    try {
        const db = getDb();
        const collection = db.collection('Wallets'); // Замените на имя вашей коллекции

        // Используем агрегацию для получения случайного документа
        const result = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();

        if (result.length === 0) {
            return null;
        } else {
            const wallet = result[0];
            return wallet.address.base58;
        }
    } catch (err) {
        console.error('Error fetching random wallet:', err);
        return null;
    }
};

// Маршрут для получения случайного кошелька
app.get('/api/random-wallet', async (req, res) => {
    const base58 = await getRandomWallet();
    console.log("is " + base58);
    if (base58) {
        res.json({ base58 });
    } else {
        res.status(404).json({ error: 'No wallets found' });
    }
});

// Подключение к базе данных и запуск сервера
connectToDb((err) => {
    if (err) {
        console.error('Failed to connect to database');
        return;
    }
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
});


//getBalance('TT3GQycpjchooQ7CuV3zivJ4bF2Zi2jEJ8').then(balance => console.log('Balance:', balance/1000000));

// Изначальные значения на сервере
let usdtInfo = 0;
let balanceInfo = 0;
let canDedInfo = 0;

app.get('/api/info', (req, res) => {
    res.json({ usdtInfo, balanceInfo, canDedInfo });
});

app.post('/api/update', async (req, res) => {
    const { amount } = req.body;

    if (amount <= 0 || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    usdtInfo += amount;
    balanceInfo += amount;
    canDedInfo += amount;

    res.json({ success: true, usdtInfo, balanceInfo, canDedInfo });

});

app.post('/send-to-wallet', (req, res) => {
    const walletAddress = req.body.address;
    const amount = req.body.amount;

    if (!walletAddress) {
        return res.status(400).json({ success: false, message: 'Адрес кошелька не указан.' });
    }

    if (canDedInfo >= 20 && canDedInfo >= amount) {
        balanceInfo -= amount;
        canDedInfo -= amount;
        usdtInfo -= amount;
        res.json({ success: true, message: `Средства успешно отправлены на адрес: ${walletAddress}.`, balanceInfo, canDedInfo, usdtInfo  });
    } else {
        res.json({ success: false, message: 'Недостаточно средств для списания.' });
    }
});

async function getBalance(address) {
    try {
        const response = await axios.get(`https://api.trongrid.io/v1/accounts/${address}`);
        if (response.data && response.data.data && response.data.data.length > 0) {
            const accountData = response.data.data[0]; // Первый элемент массива данных
            if (accountData.balance !== undefined) {
                return accountData.balance;
            } else {
                console.error('Balance not found in account data:', accountData);
                return 'Balance not found';
            }
        } else {
            console.error('No data found in response:', response.data);
            return 'No data found';
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        return 'Error fetching balance';
    }
}

