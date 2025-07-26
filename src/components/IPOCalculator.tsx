import { useState } from 'react';
import './IPOCalculator.css';

interface IPOData {
  applicationAmount: number;
  lotSize: number;
  sharePrice: number;
  oversubscriptionRatio: number;
  category: 'retail' | 'hni' | 'institutional';
}

interface CalculationResult {
  probabilityPercentage: number;
  expectedAllotment: number;
  totalApplications: number;
  availableShares: number;
}

const IPOCalculator = () => {
  const [formData, setFormData] = useState<IPOData>({
    applicationAmount: 0,
    lotSize: 0,
    sharePrice: 0,
    oversubscriptionRatio: 0,
    category: 'retail'
  });

  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'category' ? value : parseFloat(value) || 0
    }));
  };

  const calculateAllotment = () => {
    const { applicationAmount, lotSize, sharePrice, oversubscriptionRatio, category } = formData;
    
    if (!applicationAmount || !lotSize || !sharePrice || !oversubscriptionRatio) {
      alert('Please fill in all fields');
      return;
    }

    const lotsApplied = Math.floor(applicationAmount / (lotSize * sharePrice));
    
    // Simplified calculation based on category and oversubscription
    let probabilityPercentage: number;
    
    if (category === 'retail') {
      // For retail investors, probability decreases with oversubscription
      if (oversubscriptionRatio <= 1) {
        probabilityPercentage = 100;
      } else if (oversubscriptionRatio <= 2) {
        probabilityPercentage = 85 - (oversubscriptionRatio - 1) * 35;
      } else if (oversubscriptionRatio <= 5) {
        probabilityPercentage = 50 - (oversubscriptionRatio - 2) * 10;
      } else {
        probabilityPercentage = Math.max(5, 20 - oversubscriptionRatio);
      }
    } else if (category === 'hni') {
      // HNI category typically has lower probability
      probabilityPercentage = Math.max(2, 30 / oversubscriptionRatio);
    } else {
      // Institutional category
      probabilityPercentage = Math.max(5, 40 / oversubscriptionRatio);
    }

    const expectedAllotment = Math.floor(lotsApplied * (probabilityPercentage / 100));
    const totalApplications = Math.floor(1000 * oversubscriptionRatio); // Estimated
    const availableShares = Math.floor(totalApplications / oversubscriptionRatio);

    setResult({
      probabilityPercentage: Math.round(probabilityPercentage * 100) / 100,
      expectedAllotment,
      totalApplications,
      availableShares
    });
  };

  const resetForm = () => {
    setFormData({
      applicationAmount: 0,
      lotSize: 0,
      sharePrice: 0,
      oversubscriptionRatio: 0,
      category: 'retail'
    });
    setResult(null);
  };

  return (
    <div className="ipo-calculator">
      <div className="calculator-form">
        <h2>Enter IPO Details</h2>
        
        <div className="form-group">
          <label htmlFor="applicationAmount">Application Amount (₹)</label>
          <input
            type="number"
            id="applicationAmount"
            name="applicationAmount"
            value={formData.applicationAmount || ''}
            onChange={handleInputChange}
            placeholder="Enter your application amount"
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lotSize">Lot Size (shares per lot)</label>
          <input
            type="number"
            id="lotSize"
            name="lotSize"
            value={formData.lotSize || ''}
            onChange={handleInputChange}
            placeholder="Enter lot size"
            min="1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="sharePrice">Share Price (₹)</label>
          <input
            type="number"
            id="sharePrice"
            name="sharePrice"
            value={formData.sharePrice || ''}
            onChange={handleInputChange}
            placeholder="Enter share price"
            min="0"
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label htmlFor="oversubscriptionRatio">Oversubscription Ratio</label>
          <input
            type="number"
            id="oversubscriptionRatio"
            name="oversubscriptionRatio"
            value={formData.oversubscriptionRatio || ''}
            onChange={handleInputChange}
            placeholder="Enter oversubscription ratio (e.g., 2.5)"
            min="0"
            step="0.1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Investor Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
          >
            <option value="retail">Retail Individual Investor (RII)</option>
            <option value="hni">High Net Worth Individual (HNI)</option>
            <option value="institutional">Qualified Institutional Buyer (QIB)</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="button" onClick={calculateAllotment} className="calculate-btn">
            Calculate Allotment Probability
          </button>
          <button type="button" onClick={resetForm} className="reset-btn">
            Reset
          </button>
        </div>
      </div>

      {result && (
        <div className="calculation-result">
          <h2>Allotment Probability Result</h2>
          
          <div className="result-card">
            <div className="result-item primary">
              <span className="label">Allotment Probability</span>
              <span className="value">{result.probabilityPercentage}%</span>
            </div>
            
            <div className="result-item">
              <span className="label">Lots Applied</span>
              <span className="value">{Math.floor(formData.applicationAmount / (formData.lotSize * formData.sharePrice))}</span>
            </div>
            
            <div className="result-item">
              <span className="label">Expected Allotment (lots)</span>
              <span className="value">{result.expectedAllotment}</span>
            </div>
            
            <div className="result-item">
              <span className="label">Expected Shares</span>
              <span className="value">{result.expectedAllotment * formData.lotSize}</span>
            </div>
          </div>

          <div className="disclaimer">
            <p><strong>Disclaimer:</strong> This is an estimated calculation based on historical patterns and should not be considered as investment advice. Actual allotment depends on various factors and is determined by the registrar.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPOCalculator;
