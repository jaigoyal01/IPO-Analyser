const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

// Shared browser instance
let sharedBrowser = null;
let browserStartTime = null;
const BROWSER_RESTART_INTERVAL = 30 * 60 * 1000; // 30 minutes

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

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeBrowser();
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
    
    // Reduced wait time since we're blocking resources
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract GMP data from the page
    const gmpData = await page.evaluate(() => {
      const tables = document.querySelectorAll('.table.table-bordered.table-striped.w-auto');
      
      if (tables.length === 0) {
        return { gmpValue: null, gmpStatus: 'Table not found' };
      }
      
      // Look for the GMP trend table
      for (let table of tables) {
        const tableText = table.textContent;
        
        // Check if this is the GMP trend table
        if (tableText.includes('GMP Date') && tableText.includes('Estimated Listing Price')) {
          
          // Get the first row of data (latest GMP)
          const firstDataRow = table.querySelector('tbody tr:first-child');
          
          if (!firstDataRow) {
            continue;
          }
          
          // Extract the Estimated Listing Price from the first row
          const cells = firstDataRow.querySelectorAll('td');
          let estimatedListingPrice = '';
          
          cells.forEach(cell => {
            const dataTitle = cell.getAttribute('data-title') || '';
            if (dataTitle === 'Estimated Listing Price') {
              estimatedListingPrice = cell.textContent.trim();
            }
          });
          
          if (estimatedListingPrice) {
            return { 
              gmpValue: estimatedListingPrice, 
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
    return {
      gmpValue: gmpData.gmpValue,
      gmpStatus: gmpData.gmpStatus,
      gmpUrl: gmpUrl
    };
    
  } catch (error) {
    console.error(`❌ Error extracting GMP from ${gmpUrl}:`, error.message);
    return {
      gmpValue: null,
      gmpStatus: 'Error',
      gmpUrl: gmpUrl
    };
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
    console.log('=== Testing GMP Extraction ===');
    
    const testIpoUrl = 'https://www.chittorgarh.com/ipo/cash-ur-drive-marketing-ipo/2136/';
    
    // Step 1: Get GMP URL
    const gmpUrl = await getGMPUrl(testIpoUrl);
    console.log(`GMP URL: ${gmpUrl}`);
    
    // Step 2: Extract GMP data
    if (gmpUrl) {
      const gmpData = await fetchGMPData(gmpUrl);
      console.log('GMP Data:', gmpData);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

// Export functions for use in other modules
module.exports = { getGMPUrl, fetchGMPData };

// Run test if this file is executed directly
if (require.main === module) {
  testGMPExtraction();
}

// Test the functions
async function testGMPExtraction() {
  try {
    console.log('=== Testing GMP Extraction ===');
    
    const testIpoUrl = 'https://www.chittorgarh.com/ipo/sellowrap-industries-ipo/2040/';
    
    // Step 1: Get GMP URL
    const gmpUrl = await getGMPUrl(testIpoUrl);
    console.log(`GMP URL: ${gmpUrl}`);
    
    // Step 2: Extract GMP data
    if (gmpUrl) {
      const gmpData = await fetchGMPData(gmpUrl);
      console.log('GMP Data:', gmpData);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

// Export functions for use in other modules
module.exports = { getGMPUrl, fetchGMPData };

// Run test if this file is executed directly
if (require.main === module) {
  testGMPExtraction();
}
