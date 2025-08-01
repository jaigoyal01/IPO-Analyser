import React, { useState } from 'react';
import './FundOptimizer.css';

interface Account {
  name: string;
  balance: number;
  requiredAmount: number;
}

interface AccountAnalysis extends Account {
  shortfall: number;
  surplus: number;
}

interface Transfer {
  from: string;
  to: string;
  amount: number;
  reason: string;
}

interface OptimizationResult {
  canProceed: boolean;
  totalRequired: number;
  totalAvailable: number;
  totalShortfall: number;
  totalSurplus: number;
  accountAnalysis: AccountAnalysis[];
  recommendedTransfers: Transfer[];
  transferCount: number;
  totalTransferAmount: number;
  summary: {
    message: string;
    status: string;
  };
}

const FundOptimizer: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([
    { name: '', balance: 0, requiredAmount: 0 }
  ]);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const addAccount = () => {
    setAccounts([...accounts, { name: '', balance: 0, requiredAmount: 0 }]);
  };

  const removeAccount = (index: number) => {
    if (accounts.length > 1) {
      setAccounts(accounts.filter((_, i) => i !== index));
    }
  };

  const updateAccount = (index: number, field: keyof Account, value: string | number) => {
    const updatedAccounts = [...accounts];
    if (field === 'name') {
      updatedAccounts[index][field] = value as string;
    } else {
      updatedAccounts[index][field] = Number(value) || 0;
    }
    setAccounts(updatedAccounts);
  };

  const optimizeFunds = async () => {
    // Validate inputs
    const validAccounts = accounts.filter(acc => 
      acc.name.trim() !== '' && (acc.balance > 0 || acc.requiredAmount > 0)
    );

    if (validAccounts.length === 0) {
      setError('Please add at least one valid account with name and amounts');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5175/api/optimize-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accounts: validAccounts }),
      });

      if (!response.ok) {
        throw new Error('Failed to optimize accounts');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to calculate optimization. Please check if the server is running.');
      console.error('Optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="fund-optimizer">
      <div className="optimizer-header">
        <h2>Fund Transfer Optimizer</h2>
        <p>Optimize fund transfers across multiple accounts to meet funding requirements</p>
      </div>

      <div className="accounts-section">
        <div className="section-header">
          <h3>Accounts</h3>
          <button className="add-btn" onClick={addAccount}>
            + Add Account
          </button>
        </div>

        <div className="accounts-list">
          {accounts.map((account, index) => (
            <div key={index} className="account-row">
              <div className="account-fields">
                <input
                  type="text"
                  placeholder="Account Name"
                  value={account.name}
                  onChange={(e) => updateAccount(index, 'name', e.target.value)}
                  className="account-name"
                />
                <input
                  type="number"
                  placeholder="Current Balance"
                  value={account.balance || ''}
                  onChange={(e) => updateAccount(index, 'balance', e.target.value)}
                  className="account-balance"
                />
                <input
                  type="number"
                  placeholder="Required Amount"
                  value={account.requiredAmount || ''}
                  onChange={(e) => updateAccount(index, 'requiredAmount', e.target.value)}
                  className="account-required"
                />
              </div>
              {accounts.length > 1 && (
                <button 
                  className="remove-btn"
                  onClick={() => removeAccount(index)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="optimize-section">
          <button 
            className="optimize-btn"
            onClick={optimizeFunds}
            disabled={loading}
          >
            {loading ? 'Calculating...' : 'Optimize Transfers'}
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>

      {result && (
        <div className="results-section">
          <div className="summary-card">
            <h3>Summary</h3>
            <div className={`status ${result.summary.status}`}>
              {result.summary.message}
            </div>
            <div className="summary-stats">
              <div className="stat">
                <span className="label">Total Required:</span>
                <span className="value">{formatCurrency(result.totalRequired)}</span>
              </div>
              <div className="stat">
                <span className="label">Total Available:</span>
                <span className="value">{formatCurrency(result.totalAvailable)}</span>
              </div>
              <div className="stat">
                <span className="label">Transfers Needed:</span>
                <span className="value">{result.transferCount}</span>
              </div>
            </div>
          </div>

          <div className="account-analysis">
            <h3>Account Analysis</h3>
            <div className="analysis-table">
              <div className="table-header">
                <span>Account</span>
                <span>Balance</span>
                <span>Required</span>
                <span>Status</span>
                <span>Amount</span>
              </div>
              {result.accountAnalysis.map((account, index) => (
                <div key={index} className="table-row">
                  <span className="account-name">{account.name}</span>
                  <span>{formatCurrency(account.balance)}</span>
                  <span>{formatCurrency(account.requiredAmount || 0)}</span>
                  <span className={account.shortfall > 0 ? 'shortfall' : account.surplus > 0 ? 'surplus' : 'balanced'}>
                    {account.shortfall > 0 ? 'Shortfall' : account.surplus > 0 ? 'Surplus' : 'Balanced'}
                  </span>
                  <span className={account.shortfall > 0 ? 'shortfall' : account.surplus > 0 ? 'surplus' : ''}>
                    {account.shortfall > 0 
                      ? `-${formatCurrency(account.shortfall)}`
                      : account.surplus > 0 
                        ? `+${formatCurrency(account.surplus)}`
                        : '₹0'
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>

          {result.recommendedTransfers.length > 0 && (
            <div className="transfers-section">
              <h3>Recommended Transfers</h3>
              <div className="transfers-list">
                {result.recommendedTransfers.map((transfer, index) => (
                  <div key={index} className="transfer-card">
                    <div className="transfer-header">
                      <span className="transfer-amount">{formatCurrency(transfer.amount)}</span>
                    </div>
                    <div className="transfer-details">
                      <div className="transfer-flow">
                        <span className="from">From: {transfer.from}</span>
                        <span className="arrow">→</span>
                        <span className="to">To: {transfer.to}</span>
                      </div>
                      <div className="transfer-reason">{transfer.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FundOptimizer;
