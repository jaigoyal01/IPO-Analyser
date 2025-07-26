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
  qibShares: string | null;
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
}

interface LiveIPO {
  id: string;
  name: string;
  issueSize: string;
  priceRange: string;
  openDate: string;
  closeDate: string;
  link: string;
  details: IPODetails;
}

const ConsolidatedIPOView = () => {
  const [ipos, setIpos] = useState<LiveIPO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5174/api/live-ipos')
      .then(res => res.json())
      .then(setIpos)
      .catch(() => setError('Failed to fetch live IPOs'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading live IPOs...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!ipos.length) return <div className="no-data">No live IPOs found.</div>;

  return (
    <div className="consolidated-ipo-view">
      <h1>Live IPO Dashboard</h1>
      <div className="table-container">
        <table className="ipo-table">
          <thead>
            <tr>
              <th rowSpan={2}>IPO Name</th>
              <th rowSpan={2}>Issue Size</th>
              <th rowSpan={2}>Price Range</th>
              <th rowSpan={2}>Open Date</th>
              <th rowSpan={2}>Close Date</th>
              <th rowSpan={2}>Lot Size</th>
              <th colSpan={3}>Retail</th>
              <th colSpan={3}>S-HNI</th>
              <th colSpan={3}>B-HNI</th>
              <th colSpan={3}>Allocation</th>
              <th colSpan={3}>Max Allottees</th>
            </tr>
            <tr>
              <th>Min Amount</th>
              <th>Min Shares</th>
              <th>Max Amount</th>
              <th>Min Amount</th>
              <th>Min Shares</th>
              <th>Max Amount</th>
              <th>Min Amount</th>
              <th>Min Shares</th>
              <th>Max Amount</th>
              <th>QIB Shares</th>
              <th>B-NII Shares</th>
              <th>S-NII Shares</th>
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
                    <a href={ipo.link} target="_blank" rel="noopener noreferrer">
                      View Details
                    </a>
                  </small>
                </td>
                <td>{ipo.issueSize}</td>
                <td>{ipo.priceRange}</td>
                <td>{ipo.openDate}</td>
                <td>{ipo.closeDate}</td>
                <td>{ipo.details?.lotSize || '-'}</td>
                
                {/* Retail */}
                <td>{ipo.details?.applications?.retailMin?.amount ? `₹${ipo.details.applications.retailMin.amount.toLocaleString('en-IN')}` : '-'}</td>
                <td>{ipo.details?.applications?.retailMin?.shares || '-'}</td>
                <td>{ipo.details?.applications?.retailMax?.amount ? `₹${ipo.details.applications.retailMax.amount.toLocaleString('en-IN')}` : '-'}</td>
                
                {/* S-HNI */}
                <td>{ipo.details?.applications?.sHniMin?.amount ? `₹${ipo.details.applications.sHniMin.amount.toLocaleString('en-IN')}` : '-'}</td>
                <td>{ipo.details?.applications?.sHniMin?.shares || '-'}</td>
                <td>{ipo.details?.applications?.sHniMax?.amount ? `₹${ipo.details.applications.sHniMax.amount.toLocaleString('en-IN')}` : '-'}</td>
                
                {/* B-HNI */}
                <td>{ipo.details?.applications?.bHniMin?.amount ? `₹${ipo.details.applications.bHniMin.amount.toLocaleString('en-IN')}` : '-'}</td>
                <td>{ipo.details?.applications?.bHniMin?.shares || '-'}</td>
                <td>-</td>
                
                {/* Allocation */}
                <td>{ipo.details?.allocation?.qibShares || '-'}</td>
                <td>{ipo.details?.allocation?.bNiiShares || '-'}</td>
                <td>{ipo.details?.allocation?.sNiiShares || '-'}</td>
                
                {/* Max Allottees */}
                <td>{ipo.details?.allocation?.maxRetailAllottees || '-'}</td>
                <td>{ipo.details?.allocation?.maxBNiiAllottees || '-'}</td>
                <td>{ipo.details?.allocation?.maxSNiiAllottees || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConsolidatedIPOView;
