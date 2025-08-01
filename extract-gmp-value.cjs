const puppeteer = require('puppeteer');

async function extractGMPValue() {
    let browser;
    try {
        console.log('🚀 Starting Puppeteer to extract GMP value...');
        
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        const url = 'https://www.investorgain.com/gmp/cash-ur-drive-marketing-ipo-gmp/1349/';
        console.log(`🔍 Navigating to: ${url}`);
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('✅ Page loaded, extracting GMP data...');
        
        // Extract the specific values we need
        const gmpData = await page.evaluate(() => {
            const table = document.querySelector('.table.table-bordered.table-striped.w-auto');
            
            if (!table) {
                return { error: 'Table not found' };
            }
            
            // Look for the GMP table (first table with GMP data)
            const tableText = table.textContent;
            if (!tableText.includes('GMP Date') || !tableText.includes('Estimated Listing Price')) {
                return { error: 'Not the GMP trend table' };
            }
            
            // Get the first row of data (latest GMP)
            const firstDataRow = table.querySelector('tbody tr:first-child');
            
            if (!firstDataRow) {
                return { error: 'No data rows found' };
            }
            
            // Extract values from the first row
            const cells = firstDataRow.querySelectorAll('td');
            
            const data = {
                date: '',
                gmpValue: '',
                estimatedListingPrice: '',
                percentage: '',
                rawData: []
            };
            
            cells.forEach((cell, index) => {
                const cellText = cell.textContent.trim();
                const dataTitle = cell.getAttribute('data-title') || '';
                
                data.rawData.push(`${index}: ${dataTitle} = ${cellText}`);
                
                if (dataTitle === 'GMP Date') {
                    data.date = cellText;
                }
                else if (dataTitle === 'GMP') {
                    // Extract just the GMP value (₹21)
                    const gmpMatch = cellText.match(/₹\d+/);
                    data.gmpValue = gmpMatch ? gmpMatch[0] : cellText;
                }
                else if (dataTitle === 'Estimated Listing Price') {
                    // Extract the full value: ₹151 (16.15%)
                    data.estimatedListingPrice = cellText;
                    
                    // Extract just the percentage part
                    const percentageMatch = cellText.match(/\(([0-9.]+%)\)/);
                    data.percentage = percentageMatch ? percentageMatch[1] : '';
                }
            });
            
            return data;
        });
        
        console.log('\n🎯 EXTRACTED GMP DATA:');
        console.log('Date:', gmpData.date);
        console.log('GMP Value:', gmpData.gmpValue);
        console.log('Estimated Listing Price:', gmpData.estimatedListingPrice);
        console.log('Percentage Gain:', gmpData.percentage);
        
        console.log('\n📊 RAW DATA FROM FIRST ROW:');
        gmpData.rawData?.forEach(item => console.log(item));
        
        if (gmpData.error) {
            console.log('❌ Error:', gmpData.error);
        }
        
        // Return the key values
        return {
            gmpValue: gmpData.gmpValue,
            estimatedListingPrice: gmpData.estimatedListingPrice,
            percentage: gmpData.percentage,
            date: gmpData.date
        };
        
    } catch (error) {
        console.error('❌ Error extracting GMP value:', error.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser closed');
        }
    }
}

// Run the extraction
extractGMPValue().then(result => {
    if (result) {
        console.log('\n✅ FINAL RESULT:');
        console.log(`GMP: ${result.gmpValue}`);
        console.log(`Estimated Listing Price: ${result.estimatedListingPrice}`);
        console.log(`Percentage: ${result.percentage}`);
        console.log(`Date: ${result.date}`);
    }
});
