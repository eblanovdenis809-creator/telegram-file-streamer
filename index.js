import express from 'express';
import fetch from 'node-fetch';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = '7104421111:AAHwq6T_H-Y6x9s2r8m0DrrCWI9cNp5WxrI';
const CHANNEL_ID = '-1001234567890'; // ID твоего канала

// База данных
const db = await open({
  filename: './videos.db',
  driver: sqlite3.Database
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT UNIQUE,
    file_name TEXT,
    file_size INTEGER,
    duration INTEGER,
    message_id INTEGER,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());

// Главная страница - ВСЕ ВИДЕО В ОДНОМ МЕСТЕ
app.get('/', async (req, res) => {
  const videos = await db.all('SELECT * FROM videos ORDER BY id DESC');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🎬 Telegram Видео</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          background: #0a0a0a; 
          color: white; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .header { 
          background: linear-gradient(135deg, #0088cc, #0055aa); 
          padding: 30px 20px; 
          text-align: center;
          box-shadow: 0 4px 20px rgba(0,136,204,0.3);
        }
        
        .header h1 { font-size: 32px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 16px; }
        
        .container { 
          max-width: 1400px; 
          margin: 30px auto; 
          padding: 0 20px; 
        }
        
        /* Сетка видео */
        .video-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); 
          gap: 25px; 
          margin-top: 30px;
        }
        
        /* Карточка видео */
        .video-card { 
          background: #1a1a1a; 
          border-radius: 12px; 
          overflow: hidden; 
          border: 1px solid #333;
          transition: all 0.3s;
        }
        
        .video-card:hover { 
          transform: translateY(-5px); 
          border-color: #0088cc;
          box-shadow: 0 10px 30px rgba(0,136,204,0.2);
        }
        
        /* Плеер внутри карточки */
        .video-player {
          width: 100%;
          aspect-ratio: 16/9;
          background: #000;
          cursor: pointer;
        }
        
        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        /* Информация о видео */
        .video-info { 
          padding: 15px; 
        }
        
        .video-title { 
          font-size: 16px; 
          font-weight: bold; 
          margin-bottom: 8px; 
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .video-meta { 
          display: flex; 
          gap: 15px; 
          color: #888; 
          font-size: 13px;
          margin-bottom: 10px;
        }
        
        .views { 
          color: #0088cc; 
          display: flex;
          align-items: center;
          gap: 3px;
        }
        
        .stats {
          background: #1a1a1a;
          padding: 25px;
          border-radius: 12px;
          margin: 20px 0;
          text-align: center;
          border: 1px solid #333;
        }
        
        .stats-number {
          font-size: 48px;
          font-weight: bold;
          color: #0088cc;
          line-height: 1;
        }
        
        .stats-label {
          color: #888;
          margin-top: 5px;
          font-size: 14px;
        }
        
        .loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          background: rgba(0,0,0,0.7);
          padding: 10px 20px;
          border-radius: 20px;
          display: none;
        }
        
        .footer {
          text-align: center;
          padding: 30px;
          color: #666;
          border-top: 1px solid #222;
          margin-top: 50px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎬 Telegram Video Stream</h1>
        <p>Видео грузятся напрямую с серверов Telegram • Быстро • Без рекламы</p>
      </div>
      
      <div class="container">
        <div class="stats">
          <div class="stats-number">${videos.length}</div>
          <div class="stats-label">видео в коллекции</div>
        </div>
        
        <div class="video-grid">
          ${await Promise.all(videos.map(async (v) => {
            // Получаем прямую ссылку на видео из Telegram
            const file = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${v.file_id}`);
            const fileData = await file.json();
            const videoUrl = fileData.ok 
              ? `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`
              : '';
            
            // Увеличиваем счетчик просмотров
            await db.run('UPDATE videos SET views = views + 1 WHERE id = ?', v.id);
            
            return `
              <div class="video-card">
                <div class="video-player">
                  <video 
                    src="${videoUrl}" 
                    controls 
                    preload="metadata"
                    onplay="updateViews(${v.id})"
                  >
                    Your browser does not support video.
                  </video>
                </div>
                <div class="video-info">
                  <div class="video-title">${v.file_name || 'video.mp4'}</div>
                  <div class="video-meta">
                    <span>📊 ${(v.file_size / 1024 / 1024).toFixed(1)} MB</span>
                    <span>⏱ ${v.duration || '??'} сек</span>
                    <span class="views">👁 ${v.views + 1}</span>
                  </div>
                </div>
              </div>
            `;
          })).then(cards => cards.join(''))}
        </div>
        
        <div class="footer">
          Видео загружаются напрямую с CDN Telegram • ${new Date().getFullYear()}
        </div>
      </div>
      
      <script>
        function updateViews(videoId) {
          fetch('/api/views/' + videoId, { method: 'POST' })
            .catch(err => console.log('Views updated'));
        }
        
        // Ленивая загрузка видео
        document.querySelectorAll('video').forEach(video => {
          video.addEventListener('play', function() {
            // Останавливаем другие видео
            document.querySelectorAll('video').forEach(v => {
              if (v !== video) v.pause();
            });
          });
        });
      </script>
    </body>
    </html>
  `);
});

// API для обновления просмотров
app.post('/api/views/:id', async (req, res) => {
  await db.run('UPDATE videos SET views = views + 1 WHERE id = ?', req.params.id);
  res.json({ ok: true });
});

// API для получения всех видео
app.get('/api/videos', async (req, res) => {
  const videos = await db.all('SELECT * FROM videos ORDER BY id DESC');
  res.json(videos);
});

// Webhook для Telegram бота
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  
  const msg = req.body?.message;
  if (!msg) return;
  
  const chatId = msg.chat.id;
  
  if (msg.text === '/start') {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        chat_id: chatId,
        text: '👋 Отправь видео - оно появится на сайте!'
      })
    });
  }
  
  if (msg.video) {
    const video = msg.video;
    
    // Сохраняем в базу
    await db.run(
      'INSERT OR IGNORE INTO videos (file_id, file_name, file_size, duration) VALUES (?, ?, ?, ?)',
      [video.file_id, video.file_name || 'video.mp4', video.file_size, video.duration]
    );
    
    // Отправляем ссылку на сайт
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ Видео добавлено!\n\nСмотреть на сайте: https://${req.headers.host}`,
        parse_mode: 'Markdown'
      })
    });
  }
});

// Установка вебхука
app.get('/setwebhook', async (req, res) => {
  const webhookUrl = `https://${req.headers.host}/webhook`;
  const result = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${webhookUrl}`);
  const data = await result.json();
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});