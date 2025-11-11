import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Closet from './pages/Closet';
import AddClothing from './pages/AddClothing';
import OutfitInspo from './pages/OutfitInspo';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

function Navigation() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">Digital Closet</Link>
      </div>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/closet">My Closet</Link></li>
        <li><Link to="/outfit-inspo">Outfit Inspo</Link></li>
        <li><Link to="/add">Add Item</Link></li>
      </ul>
      <div className="nav-user">
        <span>Hi, {user.name}!</span>
        <button onClick={logout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App">
      <Navigation />
      <main>
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/" /> : <Register />} 
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/closet"
            element={
              <ProtectedRoute>
                <Closet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/outfit-inspo"
            element={
              <ProtectedRoute>
                <OutfitInspo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <AddClothing />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
