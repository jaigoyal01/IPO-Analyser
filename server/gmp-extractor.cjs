const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

// Shared browser instance
let sharedBrowser = null;
let browserStartTime = null;
const BROWSER_RESTART_INTERVAL = 30 * 60 * 1000; // 30 minutes

// GMP data cache
const gmpCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Function to get or create a shared browser instance
async function getSharedBrowser() {
  try {
    // Check if browser needs restart (after 30 minutes or if closed)
    const now = Date.now();
    if (sharedBrowser && browserStartTime && (now - browserStartTime > BROWSER_RESTART_INTERVAL)) {
      console.log('🔄 Browser instance expired, restarting...');
      await closeBrowser();
    }

    // Check if browser is still connected
    if (sharedBrowser && !sharedBrowser.isConnected()) {
      console.log('🔄 Browser disconnected, creating new instance...');
      sharedBrowser = null;
    }

    // Create new browser if needed
    if (!sharedBrowser) {
      console.log('🚀 Starting new shared browser instance...');
      sharedBrowser = await puppeteer.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-extensions',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--no-first-run'
        ]
      });
      browserStartTime = now;
      console.log('✅ Shared browser instance ready');
    }

    return sharedBrowser;
  } catch (error) {
    console.error('❌ Error creating shared browser:', error.message);
    sharedBrowser = null;
    throw error;
  }
}

// Function to close the shared browser
async function closeBrowser() {
  if (sharedBrowser) {
    try {
      console.log('🔒 Closing shared browser instance...');
      await sharedBrowser.close();
      sharedBrowser = null;
      browserStartTime = null;
    } catch (error) {
      console.error('Error closing browser:', error.message);
      sharedBrowser = null;
    }
  }
}

// Cache management functions
function getCachedGMPData(gmpUrl) {
  const cached = gmpCache.get(gmpUrl);
  if (cached) {
    const now = Date.now();
    if (now - cached.timestamp < CACHE_DURATION) {
      console.log(`📋 Using cached GMP data for: ${gmpUrl}`);
      return cached.data;
    } else {
      // Cache expired, remove it
      gmpCache.delete(gmpUrl);
      console.log(`⏰ Cache expired for: ${gmpUrl}`);
    }
  }
  return null;
}

function setCachedGMPData(gmpUrl, data) {
  gmpCache.set(gmpUrl, {
    data: data,
    timestamp: Date.now()
  });
  console.log(`💾 Cached GMP data for: ${gmpUrl}`);
}

function clearExpiredCache() {
  const now = Date.now();
  let clearedCount = 0;
  
  for (const [url, cached] of gmpCache.entries()) {
    if (now - cached.timestamp >= CACHE_DURATION) {
      gmpCache.delete(url);
      clearedCount++;
    }
  }
  
  if (clearedCount > 0) {
    console.log(`🧹 Cleared ${clearedCount} expired cache entries`);
  }
}

// Periodic cache cleanup (every 10 minutes)
setInterval(() => {
  clearExpiredCache();
}, 10 * 60 * 1000);

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeBrowser();
  gmpCache.clear();
  console.log('🧹 Cleared all cache data');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeBrowser();
  gmpCache.clear();
  console.log('🧹 Cleared all cache data');
  process.exit(0);
});

// Function to extract GMP URL from IPO detail page
async function getGMPUrl(ipoUrl) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    
    const response = await axios.get(ipoUrl, { headers });
    const $ = cheerio.load(response.data);
    
    // Look for the specific GMP link
    let gmpUrl = null;
    $('a[href*="investorgain.com/chr-gmp"]').each((i, el) => {
      const link = $(el).attr('href');
      if (link && link.includes('chr-gmp')) {
        gmpUrl = link;
        return false; // Break the loop
      }
    });
    
    return gmpUrl;
  } catch (error) {
    console.log(`Error getting GMP URL from ${ipoUrl}:`, error.message);
    return null;
  }
}

// Function to extract GMP data using shared Puppeteer browser
async function fetchGMPData(gmpUrl) {
  let page;
  try {
    if (!gmpUrl) return null;
    
    // Check cache first
    const cachedData = getCachedGMPData(gmpUrl);
    if (cachedData) {
      return cachedData;
    }
    
    console.log(`🔍 Extracting GMP from: ${gmpUrl}`);
    
    // Get the shared browser instance
    const browser = await getSharedBrowser();
    
    // Create a new page for this extraction
    page = await browser.newPage();
    
    // Optimize page for faster loading
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    await page.goto(gmpUrl, { 
      waitUntil: 'domcontentloaded', // Faster than networkidle2
      timeout: 15000 // Reduced timeout
    });
    
    // Wait for table to appear (up to 5 seconds)
    try {
      await page.waitForSelector('table', { timeout: 5000 });
    } catch (e) {
      console.log('Table selector wait timed out, continuing...');
    }
    
    // Additional wait for table content to populate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract GMP data from the page
    const gmpData = await page.evaluate(() => {
      // Find the GMP table by content (more resilient to class changes)
      const tables = document.querySelectorAll('table');
      
      for (let table of tables) {
        const tableText = table.textContent;
        
        // Check if this is the GMP trend table
        if (tableText.includes('GMP Date') && tableText.includes('Estimated Listing Price')) {
          
          // Get the first row of data (latest GMP)
          const firstDataRow = table.querySelector('tbody tr:first-child');
          
          if (!firstDataRow) {
            continue;
          }
          
          // Extract GMP and Estimated Listing Price from the first row
          const cells = firstDataRow.querySelectorAll('td');
          let estimatedListingPrice = '';
          let gmpRaw = '';
          
          cells.forEach(cell => {
            const dataTitle = cell.getAttribute('data-title') || '';
            if (dataTitle === 'Estimated Listing Price') {
              estimatedListingPrice = cell.textContent.trim();
            }
            if (dataTitle === 'GMP') {
              gmpRaw = cell.textContent.trim();
            }
          });
          
          if (estimatedListingPrice || gmpRaw) {
            return { 
              gmpValue: estimatedListingPrice || gmpRaw, 
              gmpRaw: gmpRaw,
              gmpStatus: 'Live' 
            };
          }
        }
      }
      
      // Check for "not yet started" or similar indicators
      const bodyText = document.body.textContent;
      if (bodyText.includes('not yet started') || bodyText.includes('not available')) {
        return { gmpValue: null, gmpStatus: 'TBD' };
      } else if (bodyText.includes('closed') || bodyText.includes('Closed')) {
        return { gmpValue: null, gmpStatus: 'Closed' };
      }
      
      return { gmpValue: null, gmpStatus: 'No data' };
    });
    
    console.log(`✅ GMP extracted: ${gmpData.gmpValue || 'TBD'}`);
    
    const result = {
      gmpValue: gmpData.gmpValue,
      gmpStatus: gmpData.gmpStatus,
      gmpUrl: gmpUrl
    };
    
    // Cache the result
    setCachedGMPData(gmpUrl, result);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error extracting GMP from ${gmpUrl}:`, error.message);
    const errorResult = {
      gmpValue: null,
      gmpStatus: 'Error',
      gmpUrl: gmpUrl
    };
    
    // Don't cache error results
    return errorResult;
  } finally {
    // Always close the page to free up memory
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.error('Error closing page:', closeError.message);
      }
    }
  }
}

// Test the functions
async function testGMPExtraction() {
  try {
    console.log('=== Testing GMP Extraction with Caching ===');
    
    const testIpoUrl = 'https://www.chittorgarh.com/ipo/cash-ur-drive-marketing-ipo/2136/';
    
    // Step 1: Get GMP URL
    const gmpUrl = await getGMPUrl(testIpoUrl);
    console.log(`GMP URL: ${gmpUrl}`);
    
    // Step 2: Extract GMP data (first time - will be fetched)
    if (gmpUrl) {
      console.log('\n--- First extraction (should fetch from web) ---');
      const gmpData1 = await fetchGMPData(gmpUrl);
      console.log('GMP Data:', gmpData1);
      
      // Step 3: Extract same GMP data (second time - should use cache)
      console.log('\n--- Second extraction (should use cache) ---');
      const gmpData2 = await fetchGMPData(gmpUrl);
      console.log('GMP Data:', gmpData2);
      
      console.log(`\n📊 Cache status: ${gmpCache.size} items cached`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    // Clean up for test
    console.log('\n🧹 Cleaning up test resources...');
    await closeBrowser();
    gmpCache.clear();
    process.exit(0);
  }
}

// Export functions for use in other modules
module.exports = { getGMPUrl, fetchGMPData };

// Run test if this file is executed directly
if (require.main === module) {
  testGMPExtraction();
}
