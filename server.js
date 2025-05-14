const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const cors = require('cors');

const token = '8180715464:AAGjcbhKQ-rdpGyB_Uv5_YRctduASPzx8yo';
const ADMIN_CHAT_ID = '484715378';
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(token, { polling: true });
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/upload', async (req, res) => {
  try {
    const { imageBase64, userId, chatId } = req.body;

    if (!imageBase64 || !userId || !chatId) {
      return res.status(400).json({ error: 'Некорректные данные запроса' });
    }

    const buffer = Buffer.from(imageBase64, 'base64');

    await bot.sendPhoto(chatId, buffer, {
      caption: '✅ Ваш мем готов!'
    });

    console.log(`📸 Мем отправлен пользователю ${userId}`);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Ошибка обработки /api/upload:', err);
    res.status(500).json({ error: 'Ошибка сервера при обработке мема' });

    if (ADMIN_CHAT_ID) {
      await bot.sendMessage(ADMIN_CHAT_ID, `❗ Ошибка /api/upload для ${req.body?.userId}:\n${err.stack || err.message}`);
    }
  }
});

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
