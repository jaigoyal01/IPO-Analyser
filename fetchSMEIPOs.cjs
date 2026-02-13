const axios = require('axios');
const cheerio = require('cheerio');
const { getGMPUrl, fetchGMPData } = require('./gmp-extractor.cjs');

// SME IPO data cache
const smeIpoCache = new Map();
const SME_CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

// Cache management for SME IPOs
function getCachedSMEData() {
  const cached = smeIpoCache.get('sme_ipos');
  if (cached) {
    const now = Date.now();
    if (now - cached.timestamp < SME_CACHE_DURATION) {
      console.log('📋 Using cached SME IPO data');
      return cached.data;
    } else {
      // Cache expired, remove it
      smeIpoCache.delete('sme_ipos');
      console.log('⏰ SME IPO cache expired');
    }
  }
  return null;
}

function setCachedSMEData(data) {
  smeIpoCache.set('sme_ipos', {
    data: data,
    timestamp: Date.now()
  });
  console.log(`💾 Cached SME IPO data (${data.length} IPOs)`);
}

// Periodic cache cleanup for SME IPOs (every 2 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of smeIpoCache.entries()) {
    if (now - cached.timestamp >= SME_CACHE_DURATION) {
      smeIpoCache.delete(key);
      console.log('🧹 Cleared expired SME IPO cache');
    }
  }
}, 60 * 60 * 1000); // Check every hour for 5-hour cache

// Helper function to calculate application amounts based on price range and lot size
function calculateApplicationAmounts(priceRange, lotSize) {
  const lotSizeNum = parseInt(lotSize) || 1000;
  
  // Parse price range to get higher price
  let higherPrice = 100; // Default fallback
  if (priceRange && priceRange !== 'TBD') {
    const priceMatch = priceRange.match(/₹(\d+(?:,\d+)*(?:\.\d+)?)\s*-\s*₹?(\d+(?:,\d+)*(?:\.\d+)?)/);
    if (priceMatch) {
      const lowerPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
      higherPrice = parseFloat(priceMatch[2].replace(/,/g, ''));
    } else {
      // Single price pattern
      const singleMatch = priceRange.match(/₹(\d+(?:,\d+)*(?:\.\d+)?)/);
      if (singleMatch) {
        higherPrice = parseFloat(singleMatch[1].replace(/,/g, ''));
      }
    }
  }
  
  // Calculate applications based on your specifications
  const retailMinShares = lotSizeNum * 2;
  const retailMinAmount = retailMinShares * higherPrice;
  
  const sHniMinShares = lotSizeNum * 3;
  const sHniMinAmount = sHniMinShares * higherPrice;
  
  // For BHNI: Find minimum lots where amount > 10 lakhs (1,000,000)
  let bHniMinLots = Math.ceil(1000000 / (lotSizeNum * higherPrice));
  if (bHniMinLots < 1) bHniMinLots = 1;
  const bHniMinShares = lotSizeNum * bHniMinLots;
  const bHniMinAmount = bHniMinShares * higherPrice;
  
  return {
    retailMin: { lots: 2, shares: retailMinShares, amount: Math.round(retailMinAmount) },
    retailMax: { lots: 2, shares: retailMinShares, amount: Math.round(retailMinAmount) },
    sHniMin: { lots: 3, shares: sHniMinShares, amount: Math.round(sHniMinAmount) },
    sHniMax: { lots: Math.ceil(bHniMinLots * 0.8), shares: Math.round(lotSizeNum * bHniMinLots * 0.8), amount: Math.round(lotSizeNum * bHniMinLots * 0.8 * higherPrice) },
    bHniMin: { lots: bHniMinLots, shares: bHniMinShares, amount: Math.round(bHniMinAmount) }
  };
}

async function fetchSMEIPOs() {
  try {
    // Check cache first
    const cachedData = getCachedSMEData();
    if (cachedData) {
      return cachedData;
    }
    
    console.log('Fetching SME IPOs from Chittorgarh.com...');
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    const pageUrl = 'https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/sme/';
    
    console.log('Fetching from: ' + pageUrl);
    const response = await axios.get(pageUrl, { headers });
    const data = response.data;
    
    console.log('Page fetched, content length:', data.length);
    
    const $ = cheerio.load(data);
    const smeIPOs = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Helper function to parse date strings
    function parseIpoDate(dateStr) {
      if (!dateStr || dateStr === 'TBD' || dateStr.trim() === '') return null;
      try {
        const cleanDate = dateStr.replace(/^[a-zA-Z]+,\s*/, '').trim();
        const date = new Date(cleanDate);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {}
      return null;
    }
    
    // Helper function to check if IPO is active or upcoming
    function isActiveOrUpcoming(openDateStr, closeDateStr) {
      const openDate = parseIpoDate(openDateStr);
      const closeDate = parseIpoDate(closeDateStr);
      
      if (!openDate) return false;
      
      // Check if currently open
      if (closeDate && openDate <= today && today <= closeDate) {
        return { status: 'open', openDate, closeDate };
      }
      
      // Check if upcoming (within next 14 days)
      const twoWeeksLater = new Date(today);
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
      if (openDate > today && openDate <= twoWeeksLater) {
        return { status: 'upcoming', openDate, closeDate };
      }
      
      return false;
    }
    
    console.log('Finding SME IPO links from page...');
    console.log('Today:', today.toDateString());
    
    // Find all SME IPO detail page links
    const ipoLinks = [];
    
    $('a[href*="/ipo/"]').each((index, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      
      // Match IPO detail page URLs
      if (href && href.match(/\/ipo\/[^\/]+-ipo\/\d+\/?$/)) {
        // Skip generic links
        if (text.toLowerCase().includes('dashboard') || 
            text.toLowerCase().includes('tracker') || 
            text.toLowerCase().includes('reports') ||
            text.toLowerCase().includes('message board') ||
            text.toLowerCase().includes('grey market')) {
          return;
        }
        
        let fullUrl = href;
        if (!fullUrl.startsWith('http')) {
          fullUrl = 'https://www.chittorgarh.com' + (fullUrl.startsWith('/') ? '' : '/') + fullUrl;
        }
        
        // Avoid duplicates
        if (!ipoLinks.find(l => l.href === fullUrl)) {
          ipoLinks.push({ name: text, href: fullUrl });
        }
      }
    });
    
    console.log(`Found ${ipoLinks.length} unique SME IPO links`);
    
    // Fetch details for each IPO to get dates and check if active/upcoming
    for (const ipo of ipoLinks) {
      console.log(`\nChecking: ${ipo.name}`);
      
      try {
        const details = await fetchSMEIPODetails(ipo.href, ipo.name, headers);
        
        if (details && details.openDate) {
          const status = isActiveOrUpcoming(details.openDate, details.closeDate);
          
          if (status) {
            console.log(`✅ ${status.status.toUpperCase()} SME IPO: ${ipo.name} (${details.openDate} - ${details.closeDate})`);
            
            const basicInfo = {
              id: String(smeIPOs.length + 1),
              name: ipo.name.replace(' IPO', '').replace(' Ltd.', ''),
              exchangePlatform: 'SME',
              issueSize: details.issueSize || 'TBD',
              priceRange: details.priceRange || 'TBD',
              openDate: details.openDate ? details.openDate.replace(/^[a-zA-Z]+,\s*/, '') : 'TBD',
              closeDate: details.closeDate ? details.closeDate.replace(/^[a-zA-Z]+,\s*/, '') : 'TBD',
              lotSize: details.lotSize || 'TBD',
              link: ipo.href,
              status: status.status,
              details: details
            };
            
            smeIPOs.push(basicInfo);
          } else {
            console.log(`⏭️ Not active/upcoming: ${ipo.name} (${details.openDate || 'no date'})`);
          }
        } else {
          console.log(`⚠️ No date info for: ${ipo.name}`);
        }
      } catch (error) {
        console.log(`❌ Error fetching details for ${ipo.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ Successfully found ${smeIPOs.length} active/upcoming SME IPOs`);
    
    // Cache the results
    if (smeIPOs.length > 0) {
      setCachedSMEData(smeIPOs);
    }
    
    return smeIPOs;
    
  } catch (error) {
    console.error('Error fetching SME IPOs:', error.message);
    return [];
  }
}

// Fetch details from an SME IPO page
async function fetchSMEIPODetails(ipoUrl, companyName, headers) {
  try {
    console.log(`Fetching SME details from: ${ipoUrl}`);
    const response = await axios.get(ipoUrl, { headers });
    const $ = cheerio.load(response.data);
    
    const details = {
      openDate: null,
      closeDate: null,
      priceRange: null,
      lotSize: null,
      issueSize: null,
      listingDate: null
    };
    
    // Extract details from table/labels
    $('tr, .detail-row').each((index, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      if (cells.length >= 2) {
        const label = $(cells[0]).text().toLowerCase().trim();
        const value = $(cells[1]).text().trim();
        
        if (label.includes('open date') || label.includes('ipo open')) {
          details.openDate = value;
        }
        if (label.includes('close date') || label.includes('ipo close')) {
          details.closeDate = value;
        }
        if (label.includes('price range') || label.includes('price band') || label.includes('issue price')) {
          details.priceRange = value;
        }
        if (label.includes('lot size') || label.includes('market lot')) {
          // Extract just the number from lot size (e.g., "1,200 Shares" -> "1200")
          const lotMatch = value.match(/[\d,]+/);
          if (lotMatch) {
            details.lotSize = lotMatch[0].replace(/,/g, '');
          } else {
            details.lotSize = value;
          }
        }
        if (label.includes('issue size') && !label.includes('fresh')) {
          details.issueSize = value;
        }
        if (label.includes('listing date')) {
          details.listingDate = value;
        }
      }
    });
    
    // Also try to find dates in text patterns
    const pageText = $('body').text();
    
    if (!details.openDate) {
      const openMatch = pageText.match(/opens?\s+on\s+([A-Za-z]+,?\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
      if (openMatch) details.openDate = openMatch[1];
    }
    
    if (!details.closeDate) {
      const closeMatch = pageText.match(/closes?\s+on\s+([A-Za-z]+,?\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
      if (closeMatch) details.closeDate = closeMatch[1];
    }
    
    // Extract GMP
    try {
      const gmpUrl = await getGMPUrl(ipoUrl);
      if (gmpUrl) {
        console.log(`Found GMP URL for ${companyName}: ${gmpUrl}`);
        const gmpData = await fetchGMPData(gmpUrl);
        if (gmpData && gmpData.gmpValue) {
          details.gmp = gmpData.gmpValue;
          details.gmpStatus = gmpData.gmpStatus;
          details.gmpUrl = gmpData.gmpUrl;
        }
      }
    } catch (e) {
      console.log(`⚠️ Could not fetch GMP for ${companyName}`);
    }
    
    // Calculate application amounts if we have price and lot size
    if (details.priceRange && details.lotSize) {
      const appAmounts = calculateApplicationAmounts(details.priceRange, details.lotSize);
      details.applications = appAmounts;
    }
    
    return details;
  } catch (error) {
    console.log(`Error fetching SME IPO details: ${error.message}`);
    return null;
  }
}

module.exports = { fetchSMEIPOs };
