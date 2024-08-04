const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');
const { connectToDb, getDb } = require('./db');
const TronWeb = require('tronweb');

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io'
});
app.use(bodyParser.json());
const cors=require("cors");
const corsOptions ={
    origin:'*',
    credentials:true,
    optionSuccessStatus:200,
}

app.use(cors(corsOptions))


app.post('/auth', async (req, res) => {
    const { telegramId, username } = req.body;
    const Wallet=createNewAccount();

    if (!connectToDb) {
        return res.status(500).json({ message: 'Database connection error' });
    }

    const usersCollection = connectToDb.collection('users');

    try {
        const existingUser = await usersCollection.findOne({ telegramId });

        if (!existingUser) {
            const newUser = { telegramId, username,Wallet };
            await usersCollection.insertOne(newUser);
            return res.json({ message: 'Ваш ID был записан в базе данных.' });
        } else {
            return res.json({ message: 'Вы уже записаны в базе данных.' });
        }
    } catch (error) {
        console.error('Error handling user data:', error);
        return res.status(500).json({ message: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
    }
});

const getRandomWallet = async () => {
    try {
        const db = getDb();
        const collection = db.collection('Wallets');

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

// app.post('/api/update', async (req, res) => {
//     const { amount } = req.body;
//
//     if (amount <= 0 || isNaN(amount)) {
//         return res.status(400).json({ error: 'Invalid amount' });
//     }
//
//     usdtInfo += amount;
//     balanceInfo += amount;
//     canDedInfo += amount;
//
//     res.json({ success: true, usdtInfo, balanceInfo, canDedInfo });
//
// });

//TO DO

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
app.post('/profofpayment', (req, res) => {
    const walletAddress = req.body.address;
    const TronWeb = require('tronweb');
    const privateKey= getPrivateKeyByAddress(walletAddress)

    const tronWeb = new TronWeb({
        fullHost: 'https://api.trongrid.io',
        headers: { "TRON-PRO-API-KEY": 'b02e2b21-f58b-48b1-a597-84b6ecee4c5d' },
        privateKey:  privateKey
    });

});
async function getPrivateKeyByAddress(address) {
    try {
        const db = getDb();

    } catch (err) {
        console.error('Error:', err);
    }
}



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
async function createNewAccount() {
    try {
        const newAccount = await tronWeb.createAccount();

        console.log(newAccount);
    } catch (error) {
        console.error('Error creating account:', error);
    }
}



const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');
const { connectToDb, getDb } = require('./db');
const TronWeb = require('tronweb');

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io'
});
app.use(bodyParser.json());
const cors=require("cors");
const corsOptions ={
    origin:'*',
    credentials:true,
    optionSuccessStatus:200,
}

app.use(cors(corsOptions))


app.post('/auth', async (req, res) => {
    const { telegramId, username } = req.body;
    const Wallet=createNewAccount();

    if (!connectToDb) {
        return res.status(500).json({ message: 'Database connection error' });
    }

    const usersCollection = connectToDb.collection('users');

    try {
        const existingUser = await usersCollection.findOne({ telegramId });

        if (!existingUser) {
            const newUser = { telegramId, username,Wallet };
            await usersCollection.insertOne(newUser);
            return res.json({ message: 'Ваш ID был записан в базе данных.' });
        } else {
            return res.json({ message: 'Вы уже записаны в базе данных.' });
        }
    } catch (error) {
        console.error('Error handling user data:', error);
        return res.status(500).json({ message: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
    }
});

const getRandomWallet = async () => {
    try {
        const db = getDb();
        const collection = db.collection('Wallets');

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

// app.post('/api/update', async (req, res) => {
//     const { amount } = req.body;
//
//     if (amount <= 0 || isNaN(amount)) {
//         return res.status(400).json({ error: 'Invalid amount' });
//     }
//
//     usdtInfo += amount;
//     balanceInfo += amount;
//     canDedInfo += amount;
//
//     res.json({ success: true, usdtInfo, balanceInfo, canDedInfo });
//
// });

//TO DO

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
app.post('/profofpayment', (req, res) => {
    const walletAddress = req.body.address;
    const TronWeb = require('tronweb');
    const privateKey= getPrivateKeyByAddress(walletAddress)

    const tronWeb = new TronWeb({
        fullHost: 'https://api.trongrid.io',
        headers: { "TRON-PRO-API-KEY": 'b02e2b21-f58b-48b1-a597-84b6ecee4c5d' },
        privateKey:  privateKey
    });

});
async function getPrivateKeyByAddress(address) {
    try {
        const db = getDb();

    } catch (err) {
        console.error('Error:', err);
    }
}



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
async function createNewAccount() {
    try {
        const newAccount = await tronWeb.createAccount();

        console.log(newAccount);
    } catch (error) {
        console.error('Error creating account:', error);
    }
}



