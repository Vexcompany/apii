const express = require('express');
const axios = require('axios');
const app = express();

const TARGET_HOST = process.env.TARGET_HOST;
const API_KEY = process.env.API_KEY;

if (!TARGET_HOST || !API_KEY) {
  console.error('Missing required environment variables: TARGET_HOST, API_KEY');
}

app.use(express.json());

app.all('/api/*', async (req, res) => {
  try {
    const cleanPath = req.url.replace(/^\/api/, '').split('?')[0];

    if (cleanPath === '/favicon.ico') return res.status(204).end();

    const clientQueries = { ...req.query };
    delete clientQueries.apikey; // jangan izinkan client override apikey

    const finalQueries = new URLSearchParams({
      ...clientQueries,
      apikey: API_KEY
    }).toString();

    const base = TARGET_HOST.replace(/\/$/, ''); // hapus trailing slash jika ada
    const targetUrl = `${base}${cleanPath}?${finalQueries}`;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    return res.status(response.status).json(response.data);

  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        status: 'error',
        message: 'Request timeout — host tidak merespons dalam 15 detik.'
      });
    }
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memproses request ke host utama.',
      detail: error.message
    });
  }
});

module.exports = app;
