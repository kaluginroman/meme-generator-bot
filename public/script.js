document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('memeCanvas');
  const canvasContainer = document.getElementById('canvasContainer');
  const ctx = canvas.getContext('2d');
  const sendMemeBtn = document.getElementById('sendMemeBtn');
  const placeholder = document.getElementById('placeholder');
  const templateGrid = document.getElementById('templateGrid');
  const backButton = document.getElementById('backButton');
  const inputsWrap = document.getElementById('inputsWrap');
  const generateButton = document.getElementById('generateButton');
  const header = document.getElementById('header');
  let currentTemplate = null;

  canvas.width = 500;
  canvas.height = 500;

  if (!window.Telegram?.WebApp) {
    console.warn("Not in Telegram environment");
    sendMemeBtn.style.display = 'none';
    return;
  }

  Telegram.WebApp.expand();
  Telegram.WebApp.enableClosingConfirmation();

  function showPlaceholder() {
    placeholder.classList.remove('hidden');
  }

  function hidePlaceholder() {
    placeholder.classList.add('hidden');
  }

  backButton.addEventListener('click', () => {
    // Очистка текстов
    document.getElementById('topText').value = '';
    document.getElementById('bottomText').value = '';

    // Сброс состояний
    header.textContent = 'Выберите шаблон';
    inputsWrap.style.display = 'none';
    generateButton.style.display = 'none';
    sendMemeBtn.style.display = 'none';
    templateGrid.style.display = 'grid';
    canvasContainer.style.display = 'none';
    showPlaceholder();
  });

  window.loadTemplate = function(templateName) {
    // Скрыть шаблоны и показать экран с инпутами
    templateGrid.style.display = 'none';
    header.textContent = 'Добавь описание';
    inputsWrap.style.display = 'flex';
    generateButton.style.display = 'inline-block';
    canvasContainer.style.display = 'block';

    showPlaceholder();

    // Загрузка выбранного шаблона
    currentTemplate = new Image();
    currentTemplate.crossOrigin = 'Anonymous';
    currentTemplate.src = `templates/${templateName}.jpg`;

    currentTemplate.onload = () => {
      const maxWidth = 500;
      const aspectRatio = currentTemplate.height / currentTemplate.width;
      canvas.width = maxWidth;
      canvas.height = maxWidth * aspectRatio;
      placeholder.style.width = `${canvas.width}px`;
      placeholder.style.height = `${canvas.height}px`;

      ctx.drawImage(currentTemplate, 0, 0, canvas.width, canvas.height);
      hidePlaceholder();
    };

    currentTemplate.onerror = () => {
      alert('Ошибка загрузки изображения');
      showPlaceholder();
    };
  };

  window.generateMeme = function() {
    if (!currentTemplate) {
      alert('Сначала выберите шаблон!');
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentTemplate, 0, 0, canvas.width, canvas.height);

    const fontSize = Math.floor(canvas.width / 12); // увеличим шрифт
    ctx.font = `bold ${fontSize}px Impact, Arial, sans-serif`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = Math.floor(fontSize / 5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const topText = document.getElementById('topText').value.toUpperCase();
    const bottomText = document.getElementById('bottomText').value.toUpperCase();

    function drawText(text, y) {
      const maxWidth = canvas.width - 20;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      ctx.strokeText(text, canvas.width / 2, y, maxWidth);
      ctx.fillText(text, canvas.width / 2, y, maxWidth);
    }

    if (topText) drawText(topText, 10);
    if (bottomText) drawText(bottomText, canvas.height - fontSize - 10);

    sendMemeBtn.style.display = 'flex';
  };

  async function ultraCompress(canvas) {
    const tempCanvas = document.createElement('canvas');
    const maxWidth = 500;
    const scale = maxWidth / canvas.width;
    tempCanvas.width = maxWidth;
    tempCanvas.height = canvas.height * scale;

    const ctx = tempCanvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    return new Promise(resolve => {
      tempCanvas.toBlob(resolve, 'image/webp', 0.7);
    });
  }

  sendMemeBtn.addEventListener('click', async () => {
    try {
      // Показываем лоадер и скрываем текст кнопки
      document.getElementById('loader').style.display = 'block';
      document.getElementById('buttonText').style.display = 'none';
      Telegram.WebApp.MainButton.showProgress(true);
      sendMemeBtn.disabled = true;

      const blob = await ultraCompress(canvas);
      console.log(`Compressed blob size: ${blob.size}`);

      const base64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const userId = Telegram.WebApp.initDataUnsafe.user?.id;
      const chatId = Telegram.WebApp.initDataUnsafe.user?.id;
      if (!userId || !chatId) throw new Error("userId не определён");

      // ✅ Заменяем sendData на fetch
      const res = await fetch('https://meme-generator-bot.onrender.com/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          userId,
          chatId
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Ошибка загрузки');

      Telegram.WebApp.close();
    } catch (error) {
      console.error('Ошибка отправки:', error);
      Telegram.WebApp.showAlert(error.message);
    } finally {
      // Скрываем лоадер и показываем текст кнопки
      document.getElementById('loader').style.display = 'none';
      document.getElementById('buttonText').style.display = 'inline';
      Telegram.WebApp.MainButton.hideProgress();
      sendMemeBtn.disabled = false;
    }
  });

  showPlaceholder();
});
