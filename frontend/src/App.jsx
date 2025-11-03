import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Closet from './pages/Closet';
import AddClothing from './pages/AddClothing';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-brand">
            <Link to="/">Digital Closet</Link>
          </div>
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/closet">My Closet</Link></li>
            <li><Link to="/add">Add Item</Link></li>
          </ul>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/closet" element={<Closet />} />
            <Route path="/add" element={<AddClothing />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
