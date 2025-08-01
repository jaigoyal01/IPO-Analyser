
import { useState } from 'react';
import ConsolidatedIPOView from './components/ConsolidatedIPOView';
import FundOptimizer from './components/FundOptimizer';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'ipos' | 'optimizer'>('ipos');

  return (
    <div className="App">
      <header className="app-header">
        <h1>IPO Dashboard & Fund Optimizer</h1>
        <p>Live IPO data and fund transfer optimization</p>
        
        <nav className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'ipos' ? 'active' : ''}`}
            onClick={() => setActiveTab('ipos')}
          >
            IPO Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'optimizer' ? 'active' : ''}`}
            onClick={() => setActiveTab('optimizer')}
          >
            Fund Optimizer
          </button>
        </nav>
      </header>
      
      <main>
        {activeTab === 'ipos' && <ConsolidatedIPOView />}
        {activeTab === 'optimizer' && <FundOptimizer />}
      </main>
    </div>
  );
}

export default App;
