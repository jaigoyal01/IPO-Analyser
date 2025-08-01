const axios = require('axios');
const cheerio = require('cheerio');

async function extractGMPData() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    
    // Test the specific GMP URL we found
    const gmpUrl = 'https://www.investorgain.com/chr-gmp/sellowrap-industries-ipo/2040';
    console.log('Checking GMP page:', gmpUrl);
    
    const response = await axios.get(gmpUrl, { headers });
    const $ = cheerio.load(response.data);
    
    console.log('GMP page loaded, content length:', response.data.length);
    
    // Look for Day-wise GMP Trend table
    console.log('\n=== Searching for Day-wise GMP Trend ===');
    const pageText = $('body').text();
    
    // Look for table headings containing "Day-wise GMP Trend"
    $('h1, h2, h3, h4, h5, h6, th, td').each((i, el) => {
      const text = $(el).text().trim();
      if (text.toLowerCase().includes('day-wise') || text.toLowerCase().includes('gmp trend')) {
        console.log(`Found heading: "${text}"`);
        
        // Look for table data near this heading
        const parent = $(el).closest('table');
        if (parent.length > 0) {
          console.log('Found table near GMP heading');
          
          // Extract table data
          const tableData = [];
          parent.find('tr').each((rowIndex, row) => {
            const cells = [];
            $(row).find('td, th').each((cellIndex, cell) => {
              cells.push($(cell).text().trim());
            });
            if (cells.length > 0) {
              tableData.push(cells);
            }
          });
          
          console.log('Table data:', tableData);
        }
      }
    });
    
    // Look for any current GMP value
    console.log('\n=== Looking for current GMP value ===');
    
    // Common patterns for GMP values
    const gmpPatterns = [
      /GMP.*?₹\s*(\d+)/gi,
      /Grey Market Premium.*?₹\s*(\d+)/gi,
      /Current GMP.*?₹\s*(\d+)/gi,
      /₹\s*(\d+)\s*GMP/gi,
      /GMP.*?(\d+)/gi
    ];
    
    for (const pattern of gmpPatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        console.log(`Found GMP pattern: ${pattern}`, matches.slice(0, 5));
      }
    }
    
    // Look for tables that might contain GMP data
    console.log('\n=== Analyzing all tables ===');
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      const headers = [];
      const firstRow = [];
      
      $table.find('tr:first th, tr:first td').each((i, cell) => {
        headers.push($(cell).text().trim());
      });
      
      $table.find('tr:eq(1) td').each((i, cell) => {
        firstRow.push($(cell).text().trim());
      });
      
      if (headers.some(h => h.toLowerCase().includes('gmp') || h.toLowerCase().includes('premium'))) {
        console.log(`Table ${tableIndex} headers:`, headers);
        console.log(`Table ${tableIndex} first row:`, firstRow);
      }
    });
    
    // Extract any numerical values that might be GMP
    console.log('\n=== Looking for numerical values ===');
    const numbers = pageText.match(/₹\s*\d+/g);
    if (numbers) {
      console.log('Found currency values:', numbers.slice(0, 10));
    }
    
  } catch (error) {
    console.error('Error fetching GMP data:', error.message);
  }
}

extractGMPData();
