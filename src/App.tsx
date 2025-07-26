
import ConsolidatedIPOView from './components/ConsolidatedIPOView';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1>IPO Allotment Dashboard</h1>
        <p>Live IPO data with consolidated allotment information</p>
      </header>
      <main>
        <ConsolidatedIPOView />
      </main>
    </div>
  );
}

export default App;
