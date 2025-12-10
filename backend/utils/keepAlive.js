const https = require('https');

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://vibe-backend.onrender.com';

/**
 * Ping server mỗi 14 phút để giữ server không bị spin down (Render free tier)
 * Render free tier sẽ tắt server sau 15 phút không có request
 */
const keepAlive = () => {
  if (process.env.NODE_ENV === 'production') {
    // Ping ngay lập tức sau khi start
    setTimeout(() => {
      pingServer();
    }, 5000);

    // Sau đó ping mỗi 14 phút
    setInterval(() => {
      pingServer();
    }, 14 * 60 * 1000); // 14 phút

    console.log('[KeepAlive] Started - pinging every 14 minutes');
  }
};

const pingServer = () => {
  const url = `${RENDER_URL}/api/health`;
  
  https.get(url, (res) => {
    console.log(`[KeepAlive] Ping status: ${res.statusCode} at ${new Date().toISOString()}`);
  }).on('error', (err) => {
    console.log('[KeepAlive] Ping error:', err.message);
  });
};

module.exports = { keepAlive };
