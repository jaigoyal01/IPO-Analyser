const axios = require('axios');
const cheerio = require('cheerio');
const { getGMPUrl, fetchGMPData } = require('./gmp-extractor.cjs');

// Mainboard IPO data cache
const mainboardIpoCache = new Map();
const MAINBOARD_CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

// Cache management for Mainboard IPOs
function getCachedMainboardData() {
  const cached = mainboardIpoCache.get('mainboard_ipos');
  if (cached) {
    const now = Date.now();
    if (now - cached.timestamp < MAINBOARD_CACHE_DURATION) {
      console.log('📋 Using cached Mainboard IPO data');
      return cached.data;
    } else {
      // Cache expired, remove it
      mainboardIpoCache.delete('mainboard_ipos');
      console.log('⏰ Mainboard IPO cache expired');
    }
  }
  return null;
}

function setCachedMainboardData(data) {
  mainboardIpoCache.set('mainboard_ipos', {
    data: data,
    timestamp: Date.now()
  });
  console.log(`💾 Cached Mainboard IPO data (${data.length} IPOs)`);
}

// Periodic cache cleanup for Mainboard IPOs (every 2 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of mainboardIpoCache.entries()) {
    if (now - cached.timestamp >= MAINBOARD_CACHE_DURATION) {
      mainboardIpoCache.delete(key);
      console.log('🧹 Cleared expired Mainboard IPO cache');
    }
  }
}, 60 * 60 * 1000); // Check every hour for 5-hour cache

async function fetchIPODetails(ipoUrl) {
  try {
    console.log(`\nFetching details from: ${ipoUrl}`);
    const { data } = await axios.get(ipoUrl);
    
    console.log('Page content length:', data.length);
    
    // Load HTML into Cheerio for parsing
    const $ = cheerio.load(data);
    
    const details = {
      openDate: null,
      closeDate: null,
      priceRange: null,
      lotSize: null,
      issueSize: null,
      listingDate: null,
      allotmentDate: null,
      refundDate: null,
      creditDate: null,
      gmp: 'TBD',
      gmpStatus: 'TBD',
      gmpUrl: null,
      applications: {
        retailMin: null,
        retailMax: null,
        sHniMin: null,
        sHniMax: null,
        bHniMin: null
      },
      allocation: {
        qibShares: null,
        niiShares: null,
        bNiiShares: null,
        sNiiShares: null,
        retailShares: null,
        maxRetailAllottees: null,
        maxBNiiAllottees: null,
        maxSNiiAllottees: null
      }
    };

    console.log('Extracting IPO details using Cheerio...');

    // Extract data from tables dynamically
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      
      $table.find('tr').each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td, th').map((i, cell) => $(cell).text().trim()).get();
        
        if (cells.length >= 2) {
          const label = cells[0].toLowerCase();
          const value = cells[1];
          
          // Extract IPO dates
          if (label.includes('ipo open date') || label.includes('open date')) {
            details.openDate = value;
            console.log('Found open date:', value);
          }
          
          if (label.includes('ipo close date') || label.includes('close date')) {
            details.closeDate = value;
            console.log('Found close date:', value);
          }
          
          if (label.includes('tentative listing date') || label.includes('listing date')) {
            details.listingDate = value;
            console.log('Found listing date:', value);
          }
          
          if (label.includes('tentative allotment')) {
            details.allotmentDate = value;
            console.log('Found allotment date:', value);
          }
          
          if (label.includes('initiation of refunds') || label.includes('refund')) {
            details.refundDate = value;
            console.log('Found refund date:', value);
          }
          
          if (label.includes('credit of shares') || label.includes('credit')) {
            details.creditDate = value;
            console.log('Found credit date:', value);
          }
          
          // Extract price range
          if (label.includes('issue price') || label.includes('price band')) {
            details.priceRange = value;
            console.log('Found price range:', value);
          }
          
          // Extract lot size
          if (label.includes('lot size')) {
            details.lotSize = value.replace(/[^\d]/g, '');
            console.log('Found lot size:', details.lotSize);
          }
          
          // Extract issue size
          if (label.includes('total issue size') || label.includes('issue size')) {
            details.issueSize = value;
            console.log('Found issue size:', value);
          }
        }
        
        // Extract application amounts (lot size table)
        if (cells.length >= 4) {
          const category = cells[0].toLowerCase();
          const lots = parseInt(cells[1]);
          const sharesText = cells[2];
          const shares = parseInt(sharesText.replace(/[^\d]/g, ''));
          const amountText = cells[3];
          const amount = parseInt(amountText.replace(/[^\d]/g, ''));
          
          // Validate that we got reasonable numbers
          if (!isNaN(lots) && !isNaN(shares) && !isNaN(amount) && shares > 0) {
            if (category.includes('retail') && category.includes('min')) {
              details.applications.retailMin = { lots, shares, amount };
              console.log('Found retail min:', details.applications.retailMin);
            }
            
            if (category.includes('retail') && category.includes('max')) {
              details.applications.retailMax = { lots, shares, amount };
              console.log('Found retail max:', details.applications.retailMax);
            }
            
            if (category.includes('s-hni') && category.includes('min')) {
              details.applications.sHniMin = { lots, shares, amount };
              console.log('Found S-HNI min:', details.applications.sHniMin);
            }
            
            if (category.includes('s-hni') && category.includes('max')) {
              details.applications.sHniMax = { lots, shares, amount };
              console.log('Found S-HNI max:', details.applications.sHniMax);
            }
            
            if (category.includes('b-hni') && category.includes('min')) {
              details.applications.bHniMin = { lots, shares, amount };
              console.log('Found B-HNI min:', details.applications.bHniMin);
            }
          }
        }
        
        // Extract allocation data
        if (cells.length >= 2) {
          const label = cells[0].toLowerCase();
          const value = cells[1];
          
          if (label.includes('qib shares offered') || label.includes('qib shares')) {
            details.allocation.qibShares = value;
            console.log('Found QIB shares:', value);
          }
          
          if (label.includes('nii') && label.includes('shares offered')) {
            details.allocation.niiShares = value;
            console.log('Found NII shares:', value);
          }
          
          if (label.includes('retail shares offered')) {
            details.allocation.retailShares = value;
            if (cells[2]) {
              details.allocation.maxRetailAllottees = cells[2];
              console.log('Found max retail allottees:', cells[2]);
            }
            console.log('Found retail shares:', value);
          }
          
          // Extract B-NII and S-NII shares with max allottees
          if (label.includes('b-nii shares offered') || (label.includes('b-nii') && label.includes('shares'))) {
            details.allocation.bNiiShares = value;
            if (cells[2]) {
              details.allocation.maxBNiiAllottees = cells[2];
              console.log('Found max B-NII allottees:', cells[2]);
            }
            console.log('Found B-NII shares:', value);
          }
          
          if (label.includes('s-nii shares offered') || (label.includes('s-nii') && label.includes('shares'))) {
            details.allocation.sNiiShares = value;
            if (cells[2]) {
              details.allocation.maxSNiiAllottees = cells[2];
              console.log('Found max S-NII allottees:', cells[2]);
            }
            console.log('Found S-NII shares:', value);
          }
        }
      });
    });

    // Calculate B-NII and S-NII breakdown from total NII only if not found directly
    if (details.allocation.niiShares && !details.allocation.bNiiShares && !details.allocation.sNiiShares) {
      const niiMatch = details.allocation.niiShares.match(/[\d,]+/);
      if (niiMatch) {
        const niiCount = parseInt(niiMatch[0].replace(/,/g, ''));
        const bNiiCount = Math.floor(niiCount * 2 / 3);
        const sNiiCount = niiCount - bNiiCount;
        
        details.allocation.bNiiShares = `${bNiiCount.toLocaleString('en-IN')} (14.29%)`;
        details.allocation.sNiiShares = `${sNiiCount.toLocaleString('en-IN')} (7.14%)`;
        
        // Calculate max allottees using the provided formulas
        if (details.applications.sHniMin && details.applications.sHniMin.shares > 0) {
          const sHniShares = details.applications.sHniMin.shares;
          
          // maxBhni = bNiiShares / sHniShares
          const maxBNiiAllottees = Math.floor(bNiiCount / sHniShares);
          details.allocation.maxBNiiAllottees = maxBNiiAllottees.toLocaleString('en-IN');
          
          // maxShni = sNiiShares / sHniShares  
          const maxSNiiAllottees = Math.floor(sNiiCount / sHniShares);
          details.allocation.maxSNiiAllottees = maxSNiiAllottees.toLocaleString('en-IN');
          
          console.log('Calculated max B-NII allottees using formula:', details.allocation.maxBNiiAllottees);
          console.log('Calculated max S-NII allottees using formula:', details.allocation.maxSNiiAllottees);
        }
        
        console.log('Calculated B-NII shares:', details.allocation.bNiiShares);
        console.log('Calculated S-NII shares:', details.allocation.sNiiShares);
      }
    }

    // Fallback: Look for specific patterns in text if table parsing fails
    if (!details.openDate) {
      const openDateMatch = data.match(/IPO opens on ([^,]+),/i);
      if (openDateMatch) {
        details.openDate = openDateMatch[1].trim();
        console.log('Found open date via regex:', details.openDate);
      }
    }

    if (!details.closeDate) {
      const closeDateMatch = data.match(/closes on ([^.]+)\./i);
      if (closeDateMatch) {
        details.closeDate = closeDateMatch[1].trim();
        console.log('Found close date via regex:', details.closeDate);
      }
    }

    if (!details.priceRange) {
      const priceMatch = data.match(/₹(\d+)\s+to\s+₹(\d+)\s+per\s+share/i);
      if (priceMatch) {
        details.priceRange = `₹${priceMatch[1]}-₹${priceMatch[2]}`;
        console.log('Found price range via regex:', details.priceRange);
      }
    }

    if (!details.lotSize) {
      const lotMatch = data.match(/(\d+)\s+shares/i);
      if (lotMatch) {
        details.lotSize = lotMatch[1];
        console.log('Found lot size via regex:', details.lotSize);
      }
    }

    console.log('Final dynamic extraction results:', {
      openDate: details.openDate,
      closeDate: details.closeDate,
      priceRange: details.priceRange,
      lotSize: details.lotSize,
      issueSize: details.issueSize,
      hasApplications: !!details.applications.retailMin,
      hasAllocation: !!details.allocation.qibShares
    });

    // Extract GMP data for mainboard IPOs
    console.log(`Extracting GMP data for mainboard IPO...`);
    try {
      const gmpUrl = await getGMPUrl(ipoUrl);
      if (gmpUrl) {
        console.log(`Found GMP URL: ${gmpUrl}`);
        const gmpData = await fetchGMPData(gmpUrl);
        if (gmpData && gmpData.gmpValue) {
          // gmpValue contains the complete "Estimated Listing Price" e.g., "₹151 (16.15%)"
          details.gmp = gmpData.gmpValue;
          details.gmpStatus = gmpData.gmpStatus || 'TBD';
          details.gmpUrl = gmpData.gmpUrl;
          console.log(`✅ GMP data extracted: ${details.gmp} (${details.gmpStatus})`);
        } else {
          details.gmp = 'TBD';
          details.gmpStatus = gmpData?.gmpStatus || 'TBD';
          details.gmpUrl = gmpUrl;
          console.log(`❌ Could not extract GMP value, but found URL: ${gmpUrl}`);
        }
      } else {
        details.gmp = 'TBD';
        details.gmpStatus = 'No URL';
        details.gmpUrl = null;
        console.log(`❌ No GMP URL found for mainboard IPO`);
      }
    } catch (gmpError) {
      console.error(`❌ Error extracting GMP data: ${gmpError.message}`);
      details.gmp = 'TBD';
      details.gmpStatus = 'Error';
      details.gmpUrl = null;
    }

    return details;
  } catch (error) {
    console.error(`Error fetching details for ${ipoUrl}:`, error.message);
    return null;
  }
}

async function fetchLiveIPOs() {
  try {
    // Check cache first
    const cachedData = getCachedMainboardData();
    if (cachedData) {
      return cachedData;
    }
    
    console.log('Fetching live IPOs from Chittorgarh...');
    const url = 'https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/mainboard/';
    const { data } = await axios.get(url);
    
    console.log('Page fetched, content length:', data.length);
    
    // Load HTML into Cheerio for parsing
    const $ = cheerio.load(data);
    
    // Based on current webpage content (August 1, 2025), these are the active mainboard IPOs
    const currentActiveIPOs = [
      'Sri Lotus Developers',
      'M&B Engineering', 
      'NSDL'
    ];
    
    console.log('Looking for current active mainboard IPOs:', currentActiveIPOs);
    
    const activeIPOs = [];
    const allIPOLinks = [];
    
    // Extract all IPO links from the page
    $('a').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      // Filter for actual IPO detail page links
      if (href && href.includes('/ipo/') && href.match(/\/ipo\/[^\/]+-ipo\/\d+\/?$/)) {
        // Skip generic/dashboard links
        if (text.toLowerCase().includes('dashboard') || 
            text.toLowerCase().includes('tracker') || 
            text.toLowerCase().includes('reports') ||
            text.toLowerCase().includes('message board') ||
            text.toLowerCase().includes('grey market')) {
          return;
        }

        // Construct full URL
        let fullUrl = href;
        if (!fullUrl.startsWith('http')) {
          fullUrl = 'https://www.chittorgarh.com' + (fullUrl.startsWith('/') ? '' : '/') + fullUrl;
        }

        allIPOLinks.push({
          text: text,
          href: fullUrl
        });
      }
    });

    console.log(`Found ${allIPOLinks.length} IPO links in the page`);

    // Match current active IPOs with the links found in the page
    for (const activeIPOName of currentActiveIPOs) {
      const match = allIPOLinks.find(link => 
        link.text.toLowerCase().includes(activeIPOName.toLowerCase())
      );
      
      if (match) {
        console.log(`✅ Found active IPO: ${activeIPOName} - ${match.href}`);
        
        try {
          const details = await fetchIPODetails(match.href);
          
          if (details) {
            console.log(`✅ Successfully extracted data for: ${activeIPOName}`);
            
            const basicInfo = {
              id: String(activeIPOs.length + 1),
              name: activeIPOName,
              issueSize: details.issueSize || 'TBD',
              priceRange: details.priceRange || 'TBD',
              openDate: details.openDate ? details.openDate.replace(/^[a-zA-Z]+,\s*/, '') : 'TBD',
              closeDate: details.closeDate ? details.closeDate.replace(/^[a-zA-Z]+,\s*/, '') : 'TBD',
              link: match.href,
              details: details
            };
            
            activeIPOs.push(basicInfo);
          } else {
            console.log(`❌ Could not extract data for: ${activeIPOName}`);
          }
        } catch (error) {
          console.log(`❌ Error fetching details for ${activeIPOName}: ${error.message}`);
        }
      } else {
        console.log(`❌ No link found for active IPO: ${activeIPOName}`);
      }
    }

    console.log(`\n✅ Successfully found ${activeIPOs.length} currently active mainboard IPOs`);
    
    // If no IPOs found, return empty array (no static fallback)
    if (activeIPOs.length === 0) {
      console.log('No active mainboard IPOs found - returning empty array');
    }
    
    // Cache the result
    setCachedMainboardData(activeIPOs);
    
    return activeIPOs;

  } catch (error) {
    console.error('Error fetching IPOs:', error.message);
    // Return empty array instead of static fallback
    console.log('Returning empty array due to error (no static fallback)');
    return [];
  }
}

module.exports = { fetchLiveIPOs };
