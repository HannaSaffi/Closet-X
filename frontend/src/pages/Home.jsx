import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  
  // Redirect to closet if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/closet');
    }
  }, [navigate]);

  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Welcome to Closet-X</h1>
        <p>Your smart wardrobe management solution</p>
        <div className="home-buttons">
          <button onClick={() => navigate('/login')} className="btn-primary">
            Login
          </button>
          <button onClick={() => navigate('/register')} className="btn-secondary">
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;