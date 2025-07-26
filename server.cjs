
const express = require('express');
const { fetchLiveIPOs } = require('./fetchLiveIPOs.cjs');
const { fetchSMEIPOs } = require('./fetchSMEIPOs.cjs');

const app = express();
const PORT = 5174;

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Mainboard IPOs endpoint
app.get('/api/live-ipos', async (req, res) => {
  try {
    console.log('Mainboard IPOs API endpoint called');
    const ipos = await fetchLiveIPOs();
    console.log('Returning Mainboard IPOs:', ipos.length);
    res.json(ipos);
  } catch (e) {
    console.error('Error fetching Mainboard IPOs:', e.message);
    res.status(500).json({ error: 'Failed to fetch live Mainboard IPOs' });
  }
});

// SME IPOs endpoint
app.get('/api/sme-ipos', async (req, res) => {
  try {
    console.log('SME IPOs API endpoint called');
    const smeIPOs = await fetchSMEIPOs();
    console.log('Returning SME IPOs:', smeIPOs.length);
    res.json(smeIPOs);
  } catch (e) {
    console.error('Error fetching SME IPOs:', e.message);
    res.status(500).json({ error: 'Failed to fetch live SME IPOs' });
  }
});

// Combined endpoint for both Mainboard and SME IPOs
app.get('/api/all-ipos', async (req, res) => {
  try {
    console.log('Combined IPOs API endpoint called');
    const [mainboardIPOs, smeIPOs] = await Promise.all([
      fetchLiveIPOs(),
      fetchSMEIPOs()
    ]);
    
    const combined = {
      mainboard: mainboardIPOs,
      sme: smeIPOs,
      total: mainboardIPOs.length + smeIPOs.length
    };
    
    console.log(`Returning combined IPOs: ${mainboardIPOs.length} Mainboard + ${smeIPOs.length} SME`);
    res.json(combined);
  } catch (e) {
    console.error('Error fetching combined IPOs:', e.message);
    res.status(500).json({ error: 'Failed to fetch combined IPOs' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
