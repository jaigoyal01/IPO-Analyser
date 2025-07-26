
import IPOCalculator from './components/IPOCalculator';
import IPODetailsPage from './components/IPODetailsPage';
import './App.css';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

interface IPODetails {
  openDate: string | null;
  closeDate: string | null;
  priceRange: string | null;
  lotSize: string | null;
  issueSize: string | null;
  listingDate: string | null;
}

interface LiveIPO {
  name: string;
  url: string;
  details?: IPODetails | null;
}

function HomePage() {
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

  if (loading) return <div>Loading live IPOs...</div>;
  if (error) return <div>{error}</div>;
  if (!ipos.length) return <div>No live IPOs found.</div>;
  
  return (
    <div>
      <section style={{marginTop: 24}}>
        <h2>Live Mainboard IPOs</h2>
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {ipos.map((ipo) => (
            <div key={ipo.url} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#f9f9f9'
            }}>
              <h3 style={{ margin: '0 0 12px 0' }}>
                <Link 
                  to={`/ipo/${ipo.name.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{ textDecoration: 'none', color: '#333' }}
                >
                  {ipo.name}
                </Link>
              </h3>
              
              {ipo.details && (
                <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                  {ipo.details.openDate && (
                    <div><strong>Open Date:</strong> {ipo.details.openDate}</div>
                  )}
                  {ipo.details.closeDate && (
                    <div><strong>Close Date:</strong> {ipo.details.closeDate}</div>
                  )}
                  {ipo.details.priceRange && (
                    <div><strong>Price Range:</strong> ₹{ipo.details.priceRange}</div>
                  )}
                  {ipo.details.lotSize && (
                    <div><strong>Lot Size:</strong> {ipo.details.lotSize} shares</div>
                  )}
                  {ipo.details.issueSize && (
                    <div><strong>Issue Size:</strong> {ipo.details.issueSize}</div>
                  )}
                  {ipo.details.listingDate && (
                    <div><strong>Expected Listing:</strong> {ipo.details.listingDate}</div>
                  )}
                </div>
              )}
              
              <div style={{ marginTop: '12px' }}>
                <Link 
                  to={`/ipo/${ipo.name.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{ 
                    display: 'inline-block',
                    padding: '8px 16px',
                    backgroundColor: '#0066cc',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    marginRight: '8px'
                  }}
                >
                  View Details
                </Link>
                <a 
                  href={ipo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'inline-block',
                    padding: '8px 16px',
                    backgroundColor: '#f0f0f0',
                    color: '#333',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  External Link
                </a>
              </div>
              
              {!ipo.details && (
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Loading IPO details...
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      
      <IPOCalculator />
    </div>
  );
}


function App() {
  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <h1>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              IPO Allotment Calculator
            </Link>
          </h1>
          <p>Calculate your probability of getting IPO shares allocated</p>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ipo/:ipoName" element={<IPODetailsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App
