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
  gmp?: string;
  gmpStatus?: string;
  gmpUrl?: string;
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

// Handles "August 7, 2026", "Fri, Jul 31, 2026" and year-less "July 29"
const toDate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  const cleaned = dateString.replace(/^\s*\w{3,9},\s*/, '').trim();
  for (const candidate of [cleaned, `${cleaned} ${new Date().getFullYear()}`]) {
    const timestamp = Date.parse(candidate);
    if (!isNaN(timestamp)) return new Date(timestamp);
  }
  return null;
};

// Unparseable dates sort last
const parseIPODate = (dateString: string | null): number =>
  toDate(dateString)?.getTime() ?? Number.MAX_SAFE_INTEGER;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// GMP arrives as "₹575 (-2.54%)" — the percentage drives the colour coding
const parseGmpPercent = (gmp?: string): number | null => {
  const match = gmp?.match(/\(\s*(-?[\d.]+)\s*%\s*\)/);
  return match ? parseFloat(match[1]) : null;
};

const ConsolidatedIPOView = () => {
  const [ipos, setIpos] = useState<LiveIPO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    fetch('http://localhost:5175/api/all-ipos')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // Combine mainboard and SME IPOs
        const allIPOs = [...(data.mainboard || []), ...(data.sme || [])];
        allIPOs.sort((a, b) => parseIPODate(a.closeDate) - parseIPODate(b.closeDate));
        setIpos(allIPOs);
      })
      .catch(err => {
        console.error('Error fetching IPO data:', err);
        setError(`Failed to fetch IPO data: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Helper function to format dates more compactly
  const formatCompactDate = (dateString: string) => {
    const date = toDate(dateString);
    if (!date) return dateString ? dateString.split(' ').slice(0, 2).join(' ') : '-';
    return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`;
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
              <th rowSpan={2}>GMP</th>
              <th colSpan={2}>Retail</th>
              <th colSpan={2}>S-HNI</th>
              <th colSpan={2}>B-HNI</th>
            </tr>
            <tr>
              <th>Min Shr</th>
              <th>Min ₹</th>
              <th>Min Shr</th>
              <th>Min ₹</th>
              <th>Min Shr</th>
              <th>Min ₹</th>
            </tr>
          </thead>
          <tbody>
            {ipos.map((ipo) => {
              const closeDate = toDate(ipo.closeDate);
              const closingToday =
                closeDate !== null && startOfDay(closeDate) === startOfDay(new Date());
              const gmpPercent = parseGmpPercent(ipo.details?.gmp);
              const gmpTone =
                gmpPercent === null ? '' : gmpPercent > 0 ? 'gmp-up' : gmpPercent < 0 ? 'gmp-down' : 'gmp-flat';

              return (
              <tr key={ipo.id} className={closingToday ? 'closing-today' : ''}>
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
                <td className="date-cell">
                  {formatCompactDate(ipo.closeDate)}
                  {closingToday && <span className="closing-tag">Last day</span>}
                </td>
                <td className="lot-cell">{ipo.details?.lotSize || '-'}</td>
                <td className={`gmp-cell ${gmpTone}`}>
                  <div>
                    <div className="gmp-value">
                      {ipo.details?.gmp && ipo.details.gmp !== 'TBD' ? ipo.details.gmp : '-'}
                    </div>
                    {ipo.details?.gmpUrl && (
                      <small>
                        <a href={ipo.details.gmpUrl} target="_blank" rel="noopener noreferrer">
                          View GMP
                        </a>
                      </small>
                    )}
                  </div>
                </td>
                
                {/* Retail */}
                <td className="compact-shares">{ipo.details?.applications?.retailMin?.shares || '-'}</td>
                <td className="compact-amount">{ipo.details?.applications?.retailMin?.amount ? `₹${ipo.details.applications.retailMin.amount.toLocaleString('en-IN')}` : '-'}</td>
                
                {/* S-HNI */}
                <td className="compact-shares">{ipo.details?.applications?.sHniMin?.shares || '-'}</td>
                <td className="compact-amount">{ipo.details?.applications?.sHniMin?.amount ? `₹${ipo.details.applications.sHniMin.amount.toLocaleString('en-IN')}` : '-'}</td>
                
                {/* B-HNI */}
                <td className="compact-shares">{ipo.details?.applications?.bHniMin?.shares || '-'}</td>
                <td className="compact-amount">{ipo.details?.applications?.bHniMin?.amount ? `₹${ipo.details.applications.bHniMin.amount.toLocaleString('en-IN')}` : '-'}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConsolidatedIPOView;
