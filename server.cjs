
const express = require('express');
const { fetchLiveIPOs } = require('./fetchLiveIPOs.cjs');

const app = express();
const PORT = 5174;

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/api/live-ipos', async (req, res) => {
  try {
    console.log('API endpoint called');
    const ipos = await fetchLiveIPOs();
    console.log('Returning IPOs:', ipos);
    res.json(ipos);
  } catch (e) {
    console.error('Error fetching IPOs:', e.message);
    res.status(500).json({ error: 'Failed to fetch live IPOs' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
