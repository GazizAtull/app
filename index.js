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


const getWallet = async (telegramId) => {
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
        const user = await usersCollection.findOne({ telegramId: parseFloat(telegramId) });

        if (!user) {
            console.log("User not found");
            return null;
        }

        if (user.Wallet && user.Wallet.address && user.Wallet.address.base58) {
            return user.Wallet.address.base58;
        } else {
            console.log('Wallet structure is missing expected fields');
            return null;
        }
    } catch (err) {
        console.error('Error fetching user wallet:', err);
        return null;
    }
};


app.post('/api/wallet', async (req, res) => {
    const { telegramId } = req.body;
    const base58 = await getWallet(telegramId);

    if (base58) {
        res.json({ base58 });
    } else {
        res.status(404).json({ error: 'Wallet not found' });
    }
});


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


app.get('/api/info', async (req, res) => {
    const telegramId = req.headers['x-telegram-id'];

    if (!telegramId) {
        return res.status(400).json({ message: 'Необходимо передать telegramId.' });
    }

    const db = getDb();
    if (!db) {
        return res.status(500).json({ message: 'Ошибка подключения к базе данных.' });
    }

    const usersCollection = db.collection('users');

    try {
        const user = await usersCollection.findOne({ telegramId: parseFloat(telegramId) });

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        const { usdtInfo, balanceInfo, canDedInfo } = user;

        // Преобразуем данные в числовой формат
        const formattedUsdtInfo = usdtInfo.$numberInt || usdtInfo;
        const formattedBalanceInfo = balanceInfo.$numberInt || balanceInfo;
        const formattedCanDedInfo = canDedInfo.$numberInt || canDedInfo;

        res.json({
            usdtInfo: formattedUsdtInfo,
            balanceInfo: formattedBalanceInfo,
            canDedInfo: formattedCanDedInfo
        });
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

app.post('/send-to-wallet', async (req, res) => {
    const walletAddress = req.body.address;
    const amount = req.body.amount;
    const telegramId = req.body.telegramId;

    if (!walletAddress) {
        return res.status(400).json({ success: false, message: 'Адрес кошелька не указан.' });
    }

    const db = getDb();
    if (!db) {
        return res.status(500).json({ message: 'Ошибка подключения к базе данных.' });
    }

    const usersCollection = db.collection('users');

    try {
        const user = await usersCollection.findOne({ telegramId: parseFloat(telegramId) });

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        // Инициализация значений с дефолтными значениями
        let { usdtInfo , balanceInfo, canDedInfo } = user;

        // Преобразуем данные в числовой формат
        usdtInfo = Number(usdtInfo);
        balanceInfo = Number(balanceInfo);
        canDedInfo = Number(canDedInfo);
//commint to github amount >=10!!!
        if (canDedInfo >= amount && amount >= 10) {
            balanceInfo -= amount;
            canDedInfo -= amount;
            usdtInfo -= amount;

            // Обновление данных пользователя в базе данных
            await usersCollection.updateOne(
                { telegramId: parseFloat(telegramId) },
                {
                    $set: {
                        balanceInfo,
                        canDedInfo,
                        usdtInfo
                    }
                }
            );

            res.json({
                success: true,
                message: `Средства успешно отправлены на адрес: ${walletAddress}.`,
                balanceInfo,
                canDedInfo,
                usdtInfo
            });
        } else {
            res.json({ success: false, message: 'Недостаточно средств для списания.' });
        }
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        return res.status(500).json({ message: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
    }

    //TO:DO отправить в кошелек, еще не придуман


});

app.post('/proofofpayment', async (req, res) => {
    const walletAddress = req.body.address;
    const amount = req.body.amount;
    console.log('is wallet adress',walletAddress)
    console.log('is wallet amount',amount)
    
    const privateKey = await getPrivateKeyByAddress(walletAddress);
    console.log(privateKey)

    if (!privateKey) {
        return res.status(400).json({ error: 'Invalid wallet address or private key not found' });
    }

    const tronWebInstance = new TronWeb({
        fullHost: 'https://api.trongrid.io',
        headers: { "TRON-PRO-API-KEY": process.env.TRON_API },
        privateKey: privateKey
    });

    console.log('TRON API URL:', tronWebInstance.fullHost);
    console.log('Address to Hex:', tronWeb.address.toHex(walletAddress));
    console.log(process.env.TRON_API)

    try {
        // Получение текущего времени и временных рамок +/- 5 минут
        const currentTime = Date.now();
        const fiveMinutesAgo = currentTime - 5 * 60 * 1000;
        const fiveMinutesLater = currentTime + 5 * 60 * 1000;

        // Получение списка транзакций на кошелек за последние 100 транзакций
        const transactions = await tronWebInstance.trx.getTransactionsRelated(walletAddress, 'to', 100, 0);

        // Фильтрация транзакций по времени
        const recentTransactions = transactions.filter(tx => tx.raw_data.timestamp >= fiveMinutesAgo && tx.raw_data.timestamp <= fiveMinutesLater);

        // Проверка транзакций на соответствие указанной сумме USDT
        const validTransaction = recentTransactions.some(tx => {
            const contract = tx.raw_data.contract[0];
            return contract.type === 'Transfer' &&
                contract.parameter.value.amount === amount * 1e6 &&
                contract.parameter.value.to_address === tronWeb.address.toHex(walletAddress) &&
                contract.parameter.value.asset_name === tronWeb.toHex('USDT');
        });

        if (validTransaction) {
            res.json({ message: 'Payment received' });
        } else {
            res.status(400).json({ message: 'Payment not found' });
        }
    } catch (error) {
        console.error('Error checking transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function getPrivateKeyByAddress(address) {
    console.log('Looking for address:', address);
    const db = getDb();
    if (!db) {
        return console.log('some mistakes,database not found')
    }
    const usersCollection = db.collection('users');
    try {
        const user = await usersCollection.findOne({  telegramId: parseFloat(address) });
         console.log('Query result:', user);
        if (!user) {
            console.log("User not found");
            return null;
        }

        if (user.Wallet && user.Wallet.privateKey ) {
            return user.Wallet.privateKey;
        } else {
            console.log('Wallet structure is missing expected fields');
            return null;
        }
    } catch (err) {
        console.error('Error fetching user wallet:', err);
        return null;
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


//bot section=======================================

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

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    sendWelcomeMessage(chatId);
});

// ===========================================================================
