const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');
const { connectToDb, getDb } = require('./db');
const TronWeb = require('tronweb');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const BigNumber = require('bignumber.js');

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


app.use(cors(corsOptions))


app.post('/auth', async (req, res) => {
    const { telegramId, username } = req.body;

    const Wallet = await createNewAccount();
    let usdtInfo = 0;
    let balanceInfo = 0;
    let canDedInfo = 0;
    let isInvited=false;

    const db = getDb();
    if (!db) {
        return res.status(500).json({ message: 'Database connection error' });
    }

    const usersCollection = db.collection('users');

    try {
        const existingUser = await usersCollection.findOne({ telegramId });
        console.log('existingUser:', existingUser);

        if (!existingUser) {
            const newUser = { telegramId, username, Wallet,usdtInfo,balanceInfo,canDedInfo,isInvited};
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
    const telegramId = req.body.telegramId;
    const expectedAmount = parseFloat(req.body.amount); // Преобразуем в число

    try {
        const privateKey = await getPrivateKeyByAddress(telegramId);
        if (!privateKey) {
            return res.status(400).json({ error: 'Invalid wallet address or private key not found' });
        }

        const transactions = await getTransactionsByAddress(walletAddress);
        if (transactions) {
            const parsedTransaction = parseTransaction(transactions);

            if (parsedTransaction && parseFloat(parsedTransaction.amount) === expectedAmount) {
                const db = getDb();
                if (!db) {
                    return res.status(500).json({ message: 'Ошибка подключения к базе данных.' });
                }

                const txIdCollection = db.collection('txId');
                const usersCollection = db.collection('users');

                try {
                    const existingTxId = await txIdCollection.findOne({ TxID: parsedTransaction.txID });
                    if (!existingTxId) {
                        const newTxId = { TxID: parsedTransaction.txID };
                        await txIdCollection.insertOne(newTxId);
                        console.log('New txid:', newTxId);

                        const user = await usersCollection.findOne({ telegramId: parseFloat(telegramId) });
                        if (!user) {
                            return res.status(404).json({ message: 'Пользователь не найден.' });
                        }

                        let { usdtInfo, balanceInfo, canDedInfo } = user;
                        usdtInfo = Number(usdtInfo);
                        balanceInfo = Number(balanceInfo);
                        canDedInfo = Number(canDedInfo);

                        if (expectedAmount >= 50) {
                            balanceInfo += expectedAmount;
                            canDedInfo += expectedAmount;
                            usdtInfo += expectedAmount;

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
                            await sendPaymentConfirmation(telegramId, newTxId, expectedAmount)

                            return res.json({
                                success: true,
                                message: `Средства успешно отправлены на адрес: ${walletAddress}.`,
                                balanceInfo,
                                canDedInfo,
                                usdtInfo
                            });
                        } else {
                            return res.json({ success: false, message: 'Недостаточно средств для списания.' });
                        }
                    } else {
                        return res.json({ message: 'Вы уже записаны в базе данных.' });
                    }
                } catch (error) {
                    console.error('Ошибка при обработке данных пользователя:', error);
                    return res.status(500).json({ message: 'Произошла ошибка. Пожалуйста, попробуйте позже.' });
                }
            } else {
                return res.status(400).json({ error: 'Payment amount does not match' });
            }
        } else {
            return res.status(404).json({ error: 'No transactions found for the address' });
        }
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

async function getTransactionsByAddress(base58Address) {
    try {

        const adress = base58Address.trim();
        const addressHex = tronWeb.address.toHex(adress);
        const response = await axios.get(`https://api.trongrid.io/v1/accounts/${addressHex}/transactions`);
        const transactions = response.data;
        if (transactions && transactions.data && transactions.data.length > 0) {
            return transactions.data[0];
        } else {
            console.log('Нет транзакций.');
            return null;
        }
    } catch (error) {
        console.error('Ошибка при получении транзакций:', error);
        return null;
    }
}

function parseTransaction(transaction) {
    if (transaction.raw_data && transaction.raw_data.contract) {
        for (const contract of transaction.raw_data.contract) {
            if (contract.parameter && contract.parameter.value) {
                const contractData = contract.parameter.value;

                if (contract.type === 'TriggerSmartContract') {
                    const methodId = contractData.data.slice(0, 8);
                    if (methodId === 'a9059cbb') { // Метод transfer(address,uint256)
                        const fromAddress = tronWeb.address.fromHex(contractData.owner_address);
                        const toAddressHex = '41' + contractData.data.slice(8, 72);
                        const toAddress = tronWeb.address.fromHex(toAddressHex);
                        const amountHex = contractData.data.slice(72, 136); // Правильное извлечение суммы (64 символа)

                        // Преобразуем в USDT (предполагается 6 десятичных знаков)
                        const amount = new BigNumber(amountHex, 16).dividedBy(1e6);
                        return {
                            txID: transaction.txID,
                            fromAddress,
                            toAddress,
                            amount: amount.toFixed()
                        };
                    }
                }
            }
        }
    } else {
        console.log('Данные транзакции не найдены.');
    }
    return null;
}

async function sendPaymentConfirmation(telegramId, txID, amount) {
    const bot = new TelegramBot(process.env.BOT_TOKEN_ALERT);
    const message = `
🚀 New Staked amount Boost 🚀

💰 Amount: ${amount} USDT
👤 User:  ${telegramId}

`;
    const options = {
        parse_mode: 'Markdown',
        message_thread_id: 5,
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Start App 🚀', url: 'https://example.com/start-app' }],
                [{ text: '🎁 Join Community! 🎁', url: 'https://example.com/join-community' }],
                [{ text: 'TXID', url: `https://tronscan.org/#/transaction/${txID}` }],
            ]
        }
    };
    bot.sendMessage(-1002220861636, message, options);

}
async function getPrivateKeyByAddress(address) {

    const db = getDb();
    if (!db) {
        return console.log('some mistakes,database not found')
    }
    const usersCollection = db.collection('users');
    try {
        const user = await usersCollection.findOne({telegramId: parseFloat(address)});

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
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const refCode = match[1];
    const ref = `https://t.me/usdtstakingapp_bot?start=${refCode}`;
    const userId = msg.from.id;
    const username = msg.from.username;

    const db = getDb();

    if (!db) {
        return bot.sendMessage(chatId, 'Ошибка подключения к базе данных.');
    }

    const referalCollection = db.collection('referal');
    const userCollection = db.collection('users');
    const user = await userCollection.findOne({ telegramId: userId });

    if (!user) {
        const Wallet = await createNewAccount();
        const newUser = {
            telegramId: userId,
            username,
            Wallet,
            usdtInfo: 0,
            balanceInfo: 0,
            canDedInfo: 0,
            isInvited: false
        };

        try {
            await userCollection.insertOne(newUser);
            console.log('New User:', newUser);
            bot.sendMessage(chatId, 'Ваш ID был записан в базе данных.');
        } catch (error) {
            console.error('Error handling user data:', error);
            return bot.sendMessage(chatId, 'Ошибка при создании нового пользователя.');
        }
    } else {
        bot.sendMessage(chatId, 'Вы уже записаны в базе данных.');
    }
    console.log(user.isInvited)

    if (refCode.startsWith('referral_')) {
        const referrerId = refCode.split('_')[1].trim();
        console.log(user.isInvited)

        if (!user.isInvited) {
            const existingReferal = await referalCollection.findOne({ REF: ref });

            if (existingReferal) {
                const friendExists = existingReferal.friends.some(friend => friend.id === userId);

                if (!friendExists) {
                    await referalCollection.updateOne(
                        { REF: ref },
                        { $push: { friends: { id: userId, username } } }
                    );

                    await userCollection.updateOne(
                        { telegramId: userId },
                        { $set: { isInvited: true } }
                    );

                    bot.sendMessage(chatId, 'Вы добавлены в список друзей по реферальной ссылке!');
                } else {
                    bot.sendMessage(chatId, 'Вы уже в списке друзей по этой реферальной ссылке.');
                }
            } else {
                bot.sendMessage(chatId, 'Реферальная ссылка не найдена.');
            }
        } else {
            bot.sendMessage(chatId, 'Вы уже были приглашены.');
        }
    } else {
        bot.sendMessage(chatId, 'Добро пожаловать!');
    }
});


// ===========================================================================

app.post('/create-ref', async (req, res) => {
    const { telegramId, username } = req.body;
    const ref = generateReferralLink(telegramId);
    const db = getDb();

    if (!db) {
        return res.status(500).json({ message: 'Ошибка подключения к базе данных.' });
    }
    const referalCollection = db.collection('referal');
    const existingReferal = await referalCollection.findOne({ REF: ref});

    if (!existingReferal) {
        const newReferal = { REF: ref, friends: [],Id:telegramId  };
        await referalCollection.insertOne(newReferal);
        console.log('New ref:', newReferal);
        res.status(200).json({ message: 'Referral created', referralLink: ref });
    } else {
        res.status(200).json({ message: 'Referral already exists', referralLink: existingReferal.REF });
    }
});

function generateReferralLink(telegramId) {
    return `https://t.me/usdtstakingapp_bot?start=referral_${telegramId}`;
}

app.get('/check-ref', async (req, res) => {
    const telegramId = req.headers['x-telegram-id'];
    const ref = generateReferralLink(telegramId);
    const db = getDb();

    if (!db) {
        return res.status(500).json({ message: 'Ошибка подключения к базе данных.' });
    }
    const referalCollection = db.collection('referal');
    const existingReferal = await referalCollection.findOne({ REF: ref });

    if (existingReferal) {
        if (existingReferal.friends && existingReferal.friends.length > 0) {
            res.status(200).json({ friends: existingReferal.friends });
        } else {
            res.status(200).json({ friends: [] });
        }
    } else {
        res.status(404).json({ message: 'Реферальная ссылка не найдена.' });
    }
});
