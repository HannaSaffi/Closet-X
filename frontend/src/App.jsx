import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Closet from './pages/Closet';
import AddClothing from './pages/AddClothing';
import OutfitInspo from './pages/OutfitInspo';
//import Analytics from './pages/Analytics';
//import EventOutfitPlanner from './pages/EventOutfitPlanner';
//import TravelPackingAssistant from './pages/TravelPackingAssistant';
//import OutfitCalendar from './pages/OutfitCalendar';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">Digital Closet</Link>
      </div>
      
      {user ? (
        <>
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
        </>
      ) : (
        <ul className="nav-links">
          <li><Link to="/login">Login</Link></li>
          <li><Link to="/register">Sign Up</Link></li>
        </ul>
      )}
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
          {/* Analytics route removed for demo
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          */}
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <AddClothing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/event-outfit"
            element={
              <ProtectedRoute>
                <EventOutfitPlanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/travel-packing"
            element={
              <ProtectedRoute>
                <TravelPackingAssistant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/outfit-calendar"
            element={
              <ProtectedRoute>
                <OutfitCalendar />
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
