const axios = require('axios');
const cheerio = require('cheerio');

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

    return details;
  } catch (error) {
    console.error(`Error fetching details for ${ipoUrl}:`, error.message);
    return null;
  }
}

async function fetchLiveIPOs() {
  try {
    console.log('Fetching live IPOs from Chittorgarh...');
    const url = 'https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/mainboard/';
    const { data } = await axios.get(url);
    
    console.log('Page fetched, content length:', data.length);
    
    // Load HTML into Cheerio for parsing
    const $ = cheerio.load(data);
    
    const ipoRows = [];
    const processedLinks = new Set();

    console.log('Extracting IPO data dynamically using Cheerio...');

    // First, look for the text that mentions current active IPOs
    const textContent = $.text();
    const activeIPOMatch = textContent.match(/current mainboard active IPOs are\s+([^.]+)\./i);
    let mentionedIPOs = [];
    
    if (activeIPOMatch) {
      console.log('Found active IPO mention:', activeIPOMatch[1]);
      // Extract IPO names from the mention
      mentionedIPOs = activeIPOMatch[1].split(',').map(name => name.trim().replace(/\s+IPO$/, ''));
      console.log('Mentioned IPO names:', mentionedIPOs);
    }

    // Look for IPO links that match specific patterns for individual IPO pages
    $('a').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      // Filter for actual IPO detail page links (not dashboard, reports, etc.)
      if (href && href.includes('/ipo/') && href.match(/\/ipo\/[^\/]+-ipo\/\d+\/?$/)) {
        // Skip if this is a generic/dashboard link
        if (text.toLowerCase().includes('dashboard') || 
            text.toLowerCase().includes('tracker') || 
            text.toLowerCase().includes('reports') ||
            text.toLowerCase().includes('message board') ||
            text.toLowerCase().includes('grey market') ||
            href.includes('dashboard') ||
            href.includes('tracker') ||
            href.includes('reports') ||
            href.includes('discussions')) {
          return;
        }

        // Construct full URL
        let fullUrl = href;
        if (!fullUrl.startsWith('http')) {
          fullUrl = 'https://www.chittorgarh.com' + (fullUrl.startsWith('/') ? '' : '/') + fullUrl;
        }

        // Avoid duplicates
        if (processedLinks.has(fullUrl)) {
          return;
        }
        processedLinks.add(fullUrl);

        // Check if this IPO is mentioned in the active list
        const isActive = mentionedIPOs.some(mentionedName => 
          text.toLowerCase().includes(mentionedName.toLowerCase()) ||
          fullUrl.toLowerCase().includes(mentionedName.toLowerCase().replace(/\s+/g, '-'))
        );

        if (isActive || mentionedIPOs.length === 0) {
          console.log(`Found potential active IPO: ${text} - ${fullUrl}`);
          
          ipoRows.push({
            name: text,
            link: fullUrl,
            priority: isActive ? 1 : 0
          });
        }
      }
    });

    // Sort by priority (mentioned IPOs first)
    ipoRows.sort((a, b) => b.priority - a.priority);

    console.log(`Found ${ipoRows.length} potential IPOs, now validating...`);

    // Now validate and get detailed information for each potential IPO
    const validIPOs = [];
    
    for (const ipo of ipoRows.slice(0, 8)) { // Check up to 8 IPOs
      console.log(`\nValidating IPO: ${ipo.name}`);
      
      try {
        const details = await fetchIPODetails(ipo.link);
        
        if (details && (details.openDate || details.closeDate || details.priceRange)) {
          console.log(`✅ Successfully extracted data for: ${ipo.name}`);
          
          // Determine if this IPO is currently active based on dates
          let isActive = false;
          
          if (details.openDate && details.closeDate) {
            // Check if dates mention July 2025 (indicating current activity)
            const openDateStr = details.openDate.toLowerCase();
            const closeDateStr = details.closeDate.toLowerCase();
            
            if ((openDateStr.includes('jul') || openDateStr.includes('july')) && 
                (closeDateStr.includes('jul') || closeDateStr.includes('july')) &&
                (openDateStr.includes('2025') || closeDateStr.includes('2025'))) {
              isActive = true;
            }
          }
          
          // Also check if this IPO was specifically mentioned as active
          const wasMentioned = mentionedIPOs.some(mentionedName => 
            ipo.name.toLowerCase().includes(mentionedName.toLowerCase())
          );
          
          if (isActive || wasMentioned) {
            console.log(`✅ Confirmed active IPO: ${ipo.name}`);
            
            // Extract basic info for the list view
            const basicInfo = {
              id: String(validIPOs.length + 1),
              name: ipo.name.replace(/\s+IPO$/, ''), // Remove trailing "IPO"
              issueSize: details.issueSize || 'TBD',
              priceRange: details.priceRange || 'TBD',
              openDate: details.openDate ? details.openDate.replace(/^[a-zA-Z]+,\s*/, '') : 'TBD',
              closeDate: details.closeDate ? details.closeDate.replace(/^[a-zA-Z]+,\s*/, '') : 'TBD',
              link: ipo.link,
              details: details
            };
            
            validIPOs.push(basicInfo);
          } else {
            console.log(`❌ IPO not currently active: ${ipo.name}`);
          }
        } else {
          console.log(`❌ Could not extract sufficient data for: ${ipo.name}`);
        }
      } catch (error) {
        console.log(`❌ Error validating ${ipo.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ Successfully found ${validIPOs.length} active IPOs`);
    
    // If no IPOs found through dynamic extraction, return empty array (no static fallback)
    if (validIPOs.length === 0) {
      console.log('No active IPOs found - returning empty array');
    }
    
    return validIPOs;

  } catch (error) {
    console.error('Error fetching IPOs:', error.message);
    // Return empty array instead of static fallback
    console.log('Returning empty array due to error (no static fallback)');
    return [];
  }
}

module.exports = { fetchLiveIPOs };
