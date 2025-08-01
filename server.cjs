
const express = require('express');
const { fetchLiveIPOs } = require('./fetchLiveIPOs.cjs');
const { fetchSMEIPOs } = require('./fetchSMEIPOs.cjs');

const app = express();
const PORT = 5175;

// Add middleware to parse JSON bodies
app.use(express.json());

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Function to calculate account optimization
function calculateAccountOptimization(accounts, requirements) {
  console.log('Input accounts:', accounts);
  console.log('Requirements:', requirements);
  
  // Calculate shortfall and surplus for each account
  const accountAnalysis = accounts.map(account => {
    const requiredAmount = account.requiredAmount || 0;
    
    return {
      ...account,
      shortfall: Math.max(0, requiredAmount - account.balance),
      surplus: Math.max(0, account.balance - requiredAmount)
    };
  });
  
  // Calculate total shortfall and surplus
  const totalShortfall = accountAnalysis.reduce((sum, acc) => sum + acc.shortfall, 0);
  const totalSurplus = accountAnalysis.reduce((sum, acc) => sum + acc.surplus, 0);
  
  // Find optimal transfers
  const transfers = [];
  const accountsWithShortfall = accountAnalysis.filter(acc => acc.shortfall > 0);
  const accountsWithSurplus = accountAnalysis.filter(acc => acc.surplus > 0);
  
  // Sort by shortfall (descending) and surplus (descending) for optimal matching
  accountsWithShortfall.sort((a, b) => b.shortfall - a.shortfall);
  accountsWithSurplus.sort((a, b) => b.surplus - a.surplus);
  
  // Match surplus accounts with shortfall accounts
  let surplusIndex = 0;
  for (const shortfallAccount of accountsWithShortfall) {
    let remainingShortfall = shortfallAccount.shortfall;
    
    while (remainingShortfall > 0 && surplusIndex < accountsWithSurplus.length) {
      const surplusAccount = accountsWithSurplus[surplusIndex];
      
      if (surplusAccount.surplus > 0) {
        const transferAmount = Math.min(remainingShortfall, surplusAccount.surplus);
        
        transfers.push({
          from: surplusAccount.name,
          to: shortfallAccount.name,
          amount: transferAmount,
          reason: `Meet funding requirement for ${shortfallAccount.name}`
        });
        
        remainingShortfall -= transferAmount;
        surplusAccount.surplus -= transferAmount;
      }
      
      if (surplusAccount.surplus === 0) {
        surplusIndex++;
      }
    }
  }
  
  // Calculate final status
  const canProceed = totalSurplus >= totalShortfall;
  const totalTransferAmount = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  
  return {
    canProceed,
    totalRequired: accountAnalysis.reduce((sum, acc) => sum + (acc.requiredAmount || 0), 0),
    totalAvailable: accounts.reduce((sum, acc) => sum + acc.balance, 0),
    totalShortfall,
    totalSurplus,
    accountAnalysis: accountAnalysis,
    recommendedTransfers: transfers,
    transferCount: transfers.length,
    totalTransferAmount,
    summary: {
      message: canProceed 
        ? `You can proceed with all requirements. ${transfers.length > 0 ? `Make ${transfers.length} transfer(s) totaling ₹${totalTransferAmount.toLocaleString('en-IN')}.` : 'No transfers needed.'}` 
        : `Insufficient total funds. You need ₹${(totalShortfall - totalSurplus).toLocaleString('en-IN')} more.`,
      status: canProceed ? 'success' : 'insufficient_funds'
    }
  };
}

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

// Generic fund optimization endpoint
app.post('/api/optimize-accounts', (req, res) => {
  try {
    console.log('Fund optimization API endpoint called');
    const { accounts } = req.body;
    
    // Validate input
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: 'Please provide valid accounts array' });
    }
    
    // Calculate optimization
    const optimization = calculateAccountOptimization(accounts);
    
    console.log('Returning optimization result');
    res.json(optimization);
  } catch (e) {
    console.error('Error calculating account optimization:', e.message);
    res.status(500).json({ error: 'Failed to calculate optimization' });
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
