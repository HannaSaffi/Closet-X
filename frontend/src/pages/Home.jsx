import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <h1>Welcome to Digital Closet</h1>
      <p>Organize your wardrobe digitally</p>
      <div className="home-buttons">
        <Link to="/closet" className="btn btn-primary">
          View My Closet
        </Link>
        <Link to="/add" className="btn btn-secondary">
          Add New Item
        </Link>
      </div>
    </div>
  );
}

export default Home;
