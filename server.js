const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const token = '8180715464:AAGjcbhKQ-rdpGyB_Uv5_YRctduASPzx8yo';
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

    await bot.sendMessage(chatId, '✅ Мем успешно создан!');
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    if (ADMIN_CHAT_ID) {
      await bot.sendMessage(ADMIN_CHAT_ID, `❌ Ошибка при загрузке изображения:\n${error.stack}`);
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// 📥 Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const webAppUrl = 'https://meme-generator-inky-one.vercel.app/';
  bot.sendMessage(chatId, 'Нажмите кнопку, чтобы создать мем:', {
    reply_markup: {
      inline_keyboard: [[{
        text: 'Открыть генератор',
        web_app: { url: webAppUrl }
      }]]
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
