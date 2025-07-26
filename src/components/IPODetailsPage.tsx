import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './IPODetails.css';

interface IPOApplication {
  lots: number;
  shares: number;
  amount: number;
}

interface IPOAllocation {
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
  applications: {
    retailMin: IPOApplication | null;
    retailMax: IPOApplication | null;
    sHniMin: IPOApplication | null;
    sHniMax: IPOApplication | null;
    bHniMin: IPOApplication | null;
  };
  allocation: IPOAllocation;
}

interface IPO {
  name: string;
  url: string;
  details?: IPODetails | null;
}

function IPODetailsPage() {
  const { ipoName } = useParams<{ ipoName: string }>();
  const [ipo, setIpo] = useState<IPO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIPODetails = async () => {
      try {
        const response = await fetch('http://localhost:5174/api/live-ipos');
        const ipos: IPO[] = await response.json();
        
        const selectedIPO = ipos.find(ipo => 
          ipo.name.toLowerCase().replace(/\s+/g, '-') === ipoName?.toLowerCase()
        );
        
        if (selectedIPO) {
          setIpo(selectedIPO);
        } else {
          setError('IPO not found');
        }
      } catch (err) {
        setError('Failed to fetch IPO details');
      } finally {
        setLoading(false);
      }
    };

    fetchIPODetails();
  }, [ipoName]);

  if (loading) return <div className="loading">Loading IPO details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!ipo) return <div className="error">IPO not found</div>;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="ipo-details-page">
      <header className="page-header">
        <Link to="/" className="back-link">← Back to IPO List</Link>
        <h1>{ipo.name} IPO Details</h1>
        <a href={ipo.url} target="_blank" rel="noopener noreferrer" className="external-link">
          View on Chittorgarh →
        </a>
      </header>

      {ipo.details && (
        <div className="details-container">
          {/* Timeline Table */}
          <section className="details-section">
            <h2>IPO Timeline</h2>
            <table className="details-table">
              <tbody>
                <tr>
                  <td>IPO Open Date</td>
                  <td>{ipo.details.openDate || 'Not Available'}</td>
                </tr>
                <tr>
                  <td>IPO Close Date</td>
                  <td>{ipo.details.closeDate || 'Not Available'}</td>
                </tr>
                <tr>
                  <td>Tentative Allotment</td>
                  <td>{ipo.details.allotmentDate || 'Not Available'}</td>
                </tr>
                <tr>
                  <td>Initiation of Refunds</td>
                  <td>{ipo.details.refundDate || 'Not Available'}</td>
                </tr>
                <tr>
                  <td>Credit of Shares to Demat</td>
                  <td>{ipo.details.creditDate || 'Not Available'}</td>
                </tr>
                <tr>
                  <td>Tentative Listing Date</td>
                  <td>{ipo.details.listingDate || 'Not Available'}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Application Details */}
          {ipo.details.applications.retailMin && (
            <section className="details-section">
              <h2>Application Details</h2>
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Lots</th>
                    <th>Shares</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Retail (Min)</td>
                    <td>{ipo.details.applications.retailMin.lots}</td>
                    <td>{ipo.details.applications.retailMin.shares.toLocaleString('en-IN')}</td>
                    <td>{formatAmount(ipo.details.applications.retailMin.amount)}</td>
                  </tr>
                  {ipo.details.applications.retailMax && (
                    <tr>
                      <td>Retail (Max)</td>
                      <td>{ipo.details.applications.retailMax.lots}</td>
                      <td>{ipo.details.applications.retailMax.shares.toLocaleString('en-IN')}</td>
                      <td>{formatAmount(ipo.details.applications.retailMax.amount)}</td>
                    </tr>
                  )}
                  {ipo.details.applications.sHniMin && (
                    <tr>
                      <td>S-HNI (Min)</td>
                      <td>{ipo.details.applications.sHniMin.lots}</td>
                      <td>{ipo.details.applications.sHniMin.shares.toLocaleString('en-IN')}</td>
                      <td>{formatAmount(ipo.details.applications.sHniMin.amount)}</td>
                    </tr>
                  )}
                  {ipo.details.applications.sHniMax && (
                    <tr>
                      <td>S-HNI (Max)</td>
                      <td>{ipo.details.applications.sHniMax.lots}</td>
                      <td>{ipo.details.applications.sHniMax.shares.toLocaleString('en-IN')}</td>
                      <td>{formatAmount(ipo.details.applications.sHniMax.amount)}</td>
                    </tr>
                  )}
                  {ipo.details.applications.bHniMin && (
                    <tr>
                      <td>B-HNI (Min)</td>
                      <td>{ipo.details.applications.bHniMin.lots}</td>
                      <td>{ipo.details.applications.bHniMin.shares.toLocaleString('en-IN')}</td>
                      <td>{formatAmount(ipo.details.applications.bHniMin.amount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {/* Share Allocation */}
          <section className="details-section">
            <h2>Share Allocation</h2>
            <table className="details-table">
              <thead>
                <tr>
                  <th>Investor Category</th>
                  <th>Shares Offered</th>
                  <th>Maximum Allottees</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>QIB Shares Offered</td>
                  <td>{ipo.details.allocation.qibShares || 'Not Available'}</td>
                  <td>NA</td>
                </tr>
                <tr>
                  <td>NII (HNI) Shares Offered</td>
                  <td>{ipo.details.allocation.niiShares || 'Not Available'}</td>
                  <td>NA</td>
                </tr>
                <tr>
                  <td>bNII &gt; ₹10L</td>
                  <td>{ipo.details.allocation.bNiiShares || 'Not Available'}</td>
                  <td>{ipo.details.allocation.maxBNiiAllottees || 'Not Available'}</td>
                </tr>
                <tr>
                  <td>sNII &lt; ₹10L</td>
                  <td>{ipo.details.allocation.sNiiShares || 'Not Available'}</td>
                  <td>{ipo.details.allocation.maxSNiiAllottees || 'Not Available'}</td>
                </tr>
                <tr>
                  <td>Retail Shares Offered</td>
                  <td>{ipo.details.allocation.retailShares || 'Not Available'}</td>
                  <td>{ipo.details.allocation.maxRetailAllottees || 'Not Available'}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Basic Information */}
          <section className="details-section">
            <h2>Basic Information</h2>
            <table className="details-table">
              <tbody>
                <tr>
                  <td>Price Range</td>
                  <td>{ipo.details.priceRange || 'Not Available'}</td>
                </tr>
                <tr>
                  <td>Lot Size</td>
                  <td>{ipo.details.lotSize ? `${ipo.details.lotSize} shares` : 'Not Available'}</td>
                </tr>
                <tr>
                  <td>Issue Size</td>
                  <td>{ipo.details.issueSize || 'Not Available'}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      )}

      {!ipo.details && (
        <div className="no-details">
          <p>Detailed information is being loaded...</p>
        </div>
      )}
    </div>
  );
}

export default IPODetailsPage;
