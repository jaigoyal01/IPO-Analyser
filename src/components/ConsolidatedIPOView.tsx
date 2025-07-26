import { useEffect, useState } from 'react';
import './ConsolidatedIPOView.css';

interface Applications {
  retailMin: { lots: number; shares: number; amount: number } | null;
  retailMax: { lots: number; shares: number; amount: number } | null;
  sHniMin: { lots: number; shares: number; amount: number } | null;
  sHniMax: { lots: number; shares: number; amount: number } | null;
  bHniMin: { lots: number; shares: number; amount: number } | null;
}

interface Allocation {
  niiShares: string | null;
  bNiiShares: string | null;
  sNiiShares: string | null;
  retailShares: string | null;
  maxRetailAllottees: string | null;
  maxBNiiAllottees: string | null;
  maxSNiiAllottees: string | null;
}

interface IPODetails {
  openDate: string | null;
  closeDate: string | null;
  priceRange: string | null;
  lotSize: string | null;
  issueSize: string | null;
  listingDate: string | null;
  allotmentDate: string | null;
  refundDate: string | null;
  creditDate: string | null;
  applications: Applications;
  allocation: Allocation;
  actualUrl?: string;
}

interface LiveIPO {
  id: string;
  name: string;
  issueSize: string;
  priceRange: string;
  openDate: string;
  closeDate: string;
  link: string;
  exchangePlatform?: string;
  securityType?: string;
  status?: string;
  details: IPODetails;
}

const ConsolidatedIPOView = () => {
  const [ipos, setIpos] = useState<LiveIPO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    console.log('Starting to fetch IPO data from API...');
    
    fetch('http://localhost:5174/api/all-ipos')
      .then(res => {
        console.log('API response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Fetched combined IPO data:', data);
        console.log('Mainboard IPOs:', data.mainboard?.length || 0);
        console.log('SME IPOs:', data.sme?.length || 0);
        
        // Combine mainboard and SME IPOs
        const allIPOs = [...(data.mainboard || []), ...(data.sme || [])];
        console.log('Total combined IPOs:', allIPOs.length);
        console.log('Sample IPO data:', allIPOs[0]);
        
        setIpos(allIPOs);
      })
      .catch(err => {
        console.error('Error fetching IPO data:', err);
        setError(`Failed to fetch IPO data: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
        console.log('API fetch completed');
      });
  }, []);

  // Helper function to format dates more compactly
  const formatCompactDate = (dateString: string) => {
    if (!dateString) return '-';
    
    // Try to extract and format dates
    const datePatterns = [
      /(\w{3}),?\s+(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i, // "Fri, Jul 25, 2025"
      /(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i, // "July 25, 2025"
    ];
    
    for (const pattern of datePatterns) {
      const match = dateString.match(pattern);
      if (match) {
        if (match.length === 5) {
          // Has day of week
          return `${match[3]}/${match[2].slice(0,3)}`;
        } else if (match.length === 4) {
          // No day of week
          return `${match[2]}/${match[1].slice(0,3)}`;
        }
      }
    }
    
    // If no pattern matches, return first few words
    return dateString.split(' ').slice(0, 2).join(' ');
  };

  // Helper function to extract only the Cr amount from issue size
  const formatIssueSize = (issueSize: string) => {
    if (!issueSize || issueSize === 'TBD') return issueSize;
    
    // Extract ₹XX.XX Cr pattern from strings like "1,80,96,000 shares (aggregating up to ₹360.11 Cr)"
    const crPattern = /₹([\d,]+(?:\.\d+)?)\s*Cr/i;
    const match = issueSize.match(crPattern);
    
    if (match) {
      return `₹${match[1]} Cr`;
    }
    
    // If it's already in the right format (₹XX Cr), return as is
    if (issueSize.includes('₹') && issueSize.includes('Cr')) {
      return issueSize;
    }
    
    // Otherwise return the original
    return issueSize;
  };

  if (loading) return <div className="loading">Loading live IPOs...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!ipos.length) {
    return (
      <div className="no-data">
        <p>No live IPOs found.</p>
        <p>Debug: API returned {ipos.length} IPOs</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="consolidated-ipo-view">
      <div className="table-container">
        <table className="ipo-table">
          <thead>
            <tr>
              <th rowSpan={2}>IPO Name</th>
              <th rowSpan={2}>Platform</th>
              <th rowSpan={2}>Issue Size</th>
              <th rowSpan={2}>Price Range</th>
              <th rowSpan={2}>Open</th>
              <th rowSpan={2}>Close</th>
              <th rowSpan={2}>Lot</th>
              <th colSpan={3}>Retail</th>
              <th colSpan={3}>S-HNI</th>
              <th colSpan={3}>B-HNI</th>
              <th colSpan={3}>Allocation</th>
              <th colSpan={3}>Max Allottees</th>
            </tr>
            <tr>
              <th>Min ₹</th>
              <th>Min Shr</th>
              <th>Max ₹</th>
              <th>Min ₹</th>
              <th>Min Shr</th>
              <th>Max ₹</th>
              <th>Min ₹</th>
              <th>Min Shr</th>
              <th>Max ₹</th>
              <th>B-NII</th>
              <th>S-NII</th>
              <th>Retail</th>
              <th>Retail</th>
              <th>B-NII</th>
              <th>S-NII</th>
            </tr>
          </thead>
          <tbody>
            {ipos.map((ipo) => (
              <tr key={ipo.id}>
                <td className="ipo-name">
                  <div>{ipo.name}</div>
                  <small>
                    <a href={ipo.details?.actualUrl || ipo.link} target="_blank" rel="noopener noreferrer">
                      View Details
                    </a>
                  </small>
                </td>
                <td className="platform-badge">
                  <span className={`badge ${ipo.exchangePlatform === 'SME' ? 'sme' : 'mainboard'}`}>
                    {ipo.exchangePlatform === 'SME' ? 'SME' : 'Main'}
                  </span>
                </td>
                <td className="compact-amount">{formatIssueSize(ipo.issueSize)}</td>
                <td className="compact-amount">{ipo.priceRange}</td>
                <td className="date-cell">{formatCompactDate(ipo.openDate)}</td>
                <td className="date-cell">{formatCompactDate(ipo.closeDate)}</td>
                <td className="lot-cell">{ipo.details?.lotSize || '-'}</td>
                
                {/* Retail */}
                <td className="compact-amount">{ipo.details?.applications?.retailMin?.amount ? `₹${ipo.details.applications.retailMin.amount.toLocaleString('en-IN')}` : '-'}</td>
                <td className="compact-shares">{ipo.details?.applications?.retailMin?.shares || '-'}</td>
                <td className="compact-amount">{ipo.details?.applications?.retailMax?.amount ? `₹${ipo.details.applications.retailMax.amount.toLocaleString('en-IN')}` : '-'}</td>
                
                {/* S-HNI */}
                <td className="compact-amount">{ipo.details?.applications?.sHniMin?.amount ? `₹${ipo.details.applications.sHniMin.amount.toLocaleString('en-IN')}` : '-'}</td>
                <td className="compact-shares">{ipo.details?.applications?.sHniMin?.shares || '-'}</td>
                <td className="compact-amount">{ipo.details?.applications?.sHniMax?.amount ? `₹${ipo.details.applications.sHniMax.amount.toLocaleString('en-IN')}` : '-'}</td>
                
                {/* B-HNI */}
                <td className="compact-amount">{ipo.details?.applications?.bHniMin?.amount ? `₹${ipo.details.applications.bHniMin.amount.toLocaleString('en-IN')}` : '-'}</td>
                <td className="compact-shares">{ipo.details?.applications?.bHniMin?.shares || '-'}</td>
                <td>-</td>
                
                {/* Allocation */}
                <td className="allocation-cell">{ipo.details?.allocation?.bNiiShares || '-'}</td>
                <td className="allocation-cell">{ipo.details?.allocation?.sNiiShares || '-'}</td>
                <td className="allocation-cell">{ipo.details?.allocation?.retailShares || '-'}</td>
                
                {/* Max Allottees */}
                <td className="allottee-cell">{ipo.details?.allocation?.maxRetailAllottees || '-'}</td>
                <td className="allottee-cell">{ipo.details?.allocation?.maxBNiiAllottees || '-'}</td>
                <td className="allottee-cell">{ipo.details?.allocation?.maxSNiiAllottees || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConsolidatedIPOView;
