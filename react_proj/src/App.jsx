import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState('');

  // fetch items when page loads
  useEffect(() => {
    fetch('http://localhost:5000/api/items')
      .then(res => res.json())
      .then(setItems);
  }, []);

  const handleAdd = () => {
    fetch('http://localhost:5000/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input })
    })
      .then(res => res.json())
      .then(newItem => setItems([...items, newItem]));
    setInput('');
  };

  return (
    <div>
      <h1>Test Connection</h1>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="type something" />
      <button onClick={handleAdd}>Add</button>
      <ul>
        {items.map((item, i) => <li key={i}>{item.name}</li>)}
      </ul>
    </div>
  );
}

export default App;