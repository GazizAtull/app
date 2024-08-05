const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');
const { connectToDb, getDb } = require('./db');
const TronWeb = require('tronweb');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io'
});
app.use(bodyParser.json());
const cors=require("cors");
const path = require("path");
const corsOptions ={
    origin:'*',
    credentials:true,
    optionSuccessStatus:200,
}
let UserTG='';

app.use(cors(corsOptions))


app.post('/auth', async (req, res) => {
    const { telegramId, username } = req.body;
    UserTG=telegramId;
    const Wallet = await createNewAccount();
    let usdtInfo = 0;
    let balanceInfo = 0;
    let canDedInfo = 0;

    const db = getDb();
    if (!db) {
        return res.status(500).json({ message: 'Database connection error' });
    }

    const usersCollection = db.collection('users');

    try {
        const existingUser = await usersCollection.findOne({ telegramId });
        console.log('existingUser:', existingUser);

        if (!existingUser) {
            const newUser = { telegramId, username, Wallet,usdtInfo,balanceInfo,canDedInfo };
            await usersCollection.insertOne(newUser);
            console.log('New User:', newUser);
            return res.json({ message: 'Ваш ID был записан в базе данных.' });
        } else {
            return res.json({ message: 'Вы уже записаны в базе данных.' });
        }
    } catch (error) {
        console.error('Error handling user data:', error);
        return res.status(500).json({ message: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
    }
});

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    try {
        processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing update:', error);
        res.sendStatus(500);
    }
});


const getRandomWallet = async () => {
    let db;
    try {
        db = getDb();
        console.log("Database object:", db);
    } catch (error) {
        console.error('Error getting database:', error.message);
        return null;
    }

    const usersCollection = db.collection('users');
    try {
        const result = await usersCollection.aggregate([{ $sample: { size: 1 } }]).toArray();
        if (result.length === 0) {
            console.log('No users found');
            return null;
        } else {
            const wallet = result[0];
            // Проверяем наличие поля 'address' и 'base58'
            if (wallet && wallet.Wallet && wallet.Wallet.address && wallet.Wallet.address.base58) {
                return wallet.Wallet.address.base58;
            } else {
                console.log('Wallet structure is missing expected fields');
                return null;
            }
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

        console.log(`Server running on :${port}`);

    });
});



//getBalance('TT3GQycpjchooQ7CuV3zivJ4bF2Zi2jEJ8').then(balance => console.log('Balance:', balance/1000000));

// Изначальные значения на сервере

app.get('/api/info', async (req, res) => {
    const { telegramId } = req.query;

    if (!telegramId) {
        return res.status(400).json({ message: 'Необходимо передать telegramId.' });
    }

    const db = getDb();
    if (!db) {
        return res.status(500).json({ message: 'Ошибка подключения к базе данных.' });
    }

    const usersCollection = db.collection('users');

    try {
        const user = await usersCollection.findOne({ telegramId });

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        const { usdtInfo, balanceInfo, canDedInfo } = user;
        res.json({ usdtInfo, balanceInfo, canDedInfo });
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        return res.status(500).json({ message: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
    }
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
        console.log('New Account:', newAccount);
        return newAccount; // Убедитесь, что возвращаете новый аккаунт
    } catch (error) {
        console.error('Error creating account:', error);
        throw error; // Пробрасывайте ошибку, если не удалось создать аккаунт
    }
}

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
    try {
        processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing update:', error);
        res.sendStatus(500);
    }
});
const sendWelcomeMessage = (chatId) => {
    const photoUrl = path.join(__dirname, 'logo.png');
    const message = `
    <b>Welcome to</b> <b><u>USDTStaking App</u></b>
    <b>Stack-To-Earn</b>

    Welcome, <a href="https://t.me/usdtstaking_news">USDTStaking App</a>! 🤝

    🚀 <b>Discover the revolutionary Stack-To-Earn app built on Telegram!</b>

    Experience limitless opportunities for Stake USDT. Our infrastructure, powered by TRON blockchain, ensures optimized transactions and reduced transfer fees.

    Be among the pioneers in earning with Tonix!

    Complete missions, invite friends, rent additional mining power to earn even more.

    Don't miss the opportunity to increase your income and strive for financial independence with us! 💰🚀

    <b>Tap Start App 👇</b>
    `;

    const options = {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⚡ Start App ⚡', web_app: { url: 'https://66afb02aa7f4c7c3d41e2066--luxury-narwhal-b92ac9.netlify.app/' } },
                ],
                [
                    { text: '🎁 Join Community! 🎁', url: 'https://t.me/usdtstaking_group/1' }
                ]
            ]
        }
    };

    bot.sendPhoto(chatId, photoUrl, { caption: message, ...options })
        .catch(error => {
            console.error('Error sending photo:', error);
        });
};

// Handle incoming messages
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    sendWelcomeMessage(chatId);
});
