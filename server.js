require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const bodyParser = require('body-parser');
const axios = require('axios');
const { execSync } = require('child_process');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Заменить на твой LIVE-ключ Stripe

const token = process.env.TELEGRAM_BOT_TOKEN;
const CRYPTO_BOT_TOKEN = process.env.CRYPTO_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = 'https://meme-generator-bot.onrender.com';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Telegram Bot
const bot = new TelegramBot(token);
bot.setWebHook(`${APP_URL}/bot${token}`);

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Upload meme
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

// ✅ CryptoBot invoice
app.post('/create-crypto-invoice', async (req, res) => {
  const { telegram_id } = req.body;

  try {
    const invoiceRes = await axios.post(
      'https://pay.crypt.bot/api/createInvoice',
      {
        asset: 'USDT',
        amount: 1,
        description: 'Премиум подписка',
        hidden_message: 'Спасибо за оплату!',
        payload: telegram_id.toString(),
        paid_btn_name: 'openBot',
        paid_btn_url: 'https://t.me/BigMemeEnergyBot',
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

// ✅ Stripe Checkout
app.post('/create-stripe-session', async (req, res) => {
  const { telegram_id } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Премиум подписка',
          },
          unit_amount: 100, // 1 USD в центах
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${APP_URL}/success.html`,
      cancel_url: `${APP_URL}/cancel.html`,
      metadata: { telegram_id }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Ошибка создания Stripe-сессии:', error.message);
    res.status(500).json({ error: 'Ошибка создания платежа' });
  }
});

// ✅ Stripe Webhook
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Ошибка Stripe webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const telegramId = session.metadata.telegram_id;

    bot.sendMessage(telegramId, '✅ Платёж через Stripe успешно получен! Спасибо за поддержку 🙌');
  }

  res.sendStatus(200);
});

// ✅ CryptoBot webhook
app.post('/crypto-webhook', async (req, res) => {
  const update = req.body;

  if (update.event === 'invoice_paid') {
    const telegramId = update.payload;

    await bot.sendMessage(telegramId, '✅ Платёж через CryptoBot успешно получен! Спасибо 🙌');
  }

  res.sendStatus(200);
});

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const webAppUrl = 'https://meme-generator-inky-one.vercel.app/';

  try {
    const cryptoInvoice = await axios.post(`${APP_URL}/create-crypto-invoice`, { telegram_id: chatId });
    const stripeInvoice = await axios.post(`${APP_URL}/create-stripe-session`, { telegram_id: chatId });

    bot.sendMessage(chatId, 'Добро пожаловать! Выберите способ оплаты или создайте мем:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Открыть генератор', web_app: { url: webAppUrl } }],
          [{ text: 'Оплатить 1 USDT (CryptoBot)', url: cryptoInvoice.data.url }],
          [{ text: 'Оплатить 1 USD (Stripe)', url: stripeInvoice.data.url }],
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка при создании ссылки оплаты:', error.message);
    bot.sendMessage(chatId, '❌ Не удалось создать ссылку оплаты. Попробуйте позже.');
  }
});

app.listen(PORT, () => {
  try {
    const commit = execSync('git log -1 --pretty=format:"%h - %s"').toString();
    console.log(`Последний коммит: ${commit}`);
  } catch (e) {
    console.log('Не удалось получить информацию о последнем коммите');
  }

  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
