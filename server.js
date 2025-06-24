const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios'); // Подключаем axios для запросов

const token = '8180715464:AAGjcbhKQ-rdpGyB_Uv5_YRctduASPzx8yo';
const CRYPTO_BOT_TOKEN = '419912:AA6EPR86K0sN4MztZ3UUaAI9fjNZaYTsLEF';
const ADMIN_CHAT_ID = '484715378';
const PORT = process.env.PORT || 3000;
const APP_URL = 'https://meme-generator-bot.onrender.com';

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// 📦 Бот без polling
const bot = new TelegramBot(token);
bot.setWebHook(`${APP_URL}/bot${token}`); // Установка webhook

// 📬 Обработка обновлений от Telegram
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 📤 Маршрут загрузки мемов
app.post('/api/upload', async (req, res) => {
  try {
    const { image, userId, chatId } = req.body;
    if (!image || !chatId) {
      return res.status(400).json({ message: 'Invalid image data' });
    }

    const buffer = Buffer.from(image, 'base64');
    await bot.sendPhoto(chatId, buffer, {
      caption: 'Ваш мем готов!',
      parse_mode: 'Markdown',
      filename: 'meme.webp'
    });

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    if (ADMIN_CHAT_ID) {
      await bot.sendMessage(ADMIN_CHAT_ID, `❌ Ошибка при загрузке изображения:\n${error.stack}`);
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Создание CryptoBot счёта
app.post('/create-crypto-invoice', async (req, res) => {
  const { telegram_id } = req.body;

  try {
    const invoiceRes = await axios.post(
      'https://pay.crypt.bot/createInvoice',
      {
        asset: 'TON',
        amount: 5, // 5 TON, можно изменить
        description: 'Оплата премиум подписки',
        hidden_message: 'Спасибо за оплату!',
        payload: telegram_id.toString(),
        paid_btn_name: 'url',
        paid_btn_url: 'https://t.me/BigMemeEnergyBot', // при необходимости замени
      },
      {
        headers: {
          'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const url = invoiceRes.data.result.pay_url;
    res.json({ url });
  } catch (err) {
    console.error('❌ Ошибка создания CryptoBot счёта:', err.response?.data || err.message);
    res.status(500).json({ error: 'Ошибка создания счёта' });
  }
});

// 📥 Команда /start — с кнопкой CryptoBot
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const webAppUrl = 'https://meme-generator-inky-one.vercel.app/';

  try {
    const invoice = await axios.post(
      `${APP_URL}/create-crypto-invoice`,
      { telegram_id: chatId },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const payUrl = invoice.data.url;

    bot.sendMessage(chatId, 'Добро пожаловать! Вы можете создать мем или купить премиум подписку:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Открыть генератор', web_app: { url: webAppUrl } }],
          [{ text: 'Оплатить 5 TON', url: payUrl }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка получения ссылки оплаты:', error.message);
    bot.sendMessage(chatId, 'Ошибка при создании ссылки для оплаты. Попробуйте позже.');
  }
});

// 🌐 Webhook от CryptoBot (оплата)
app.post('/crypto-webhook', async (req, res) => {
  const update = req.body;

  if (update.event === 'invoice_paid') {
    const telegramId = update.payload;

    await bot.sendMessage(telegramId, '✅ Платёж в TON успешно получен! Спасибо за поддержку 🙌');
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
