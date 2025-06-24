# Telegram Meme Generator Bot

Создай мем в Telegram Mini App и получи его прямо в чат от бота. Работает через WebApp и Telegram Webhooks.

---

## ✨ Возможности

- Выбор шаблонов мемов
- Ввод текста сверху и снизу
- Отправка готового мема в бот
- Сервер использует Webhook, не polling

---

## 🚀 Деплой

### 🌐 Клиент (Vercel)

1. Например, добавь шаблон в `public/templates/`
2. Запусти команды:

```bash
git add .
git commit -m "Обновление UI"
git push
vercel deploy --prod
```

### 💻 Сервер (Render)

1. После `git push` Render сам отследит и сделает redeploy
2. Если нет — зайди в [Render Dashboard](https://dashboard.render.com), выбери сервис и нажми **Manual Deploy → Deploy latest commit**

---

## 💡 Локальный запуск

1. Установи зависимости:

```bash
npm install
```

2. Запусти:

```bash
npm run dev
# или
npm start
```

3. Открой WebApp:

```
http://localhost:3000/index.html
```

---

## 📝 Скрипты (package.json)

```json
"scripts": {
  "start": "node serve.js",
  "dev": "node serve.js",
  "deploy:vercel": "vercel deploy --prod"
}
```

---

## 🌐 Ссылки

- Vercel App: `https://meme-generator-inky-one.vercel.app`
- Render API: `https://meme-generator-bot.onrender.com`

---

🚀 Проект готов к модернизации: оплата, платные шаблоны, аналитика
