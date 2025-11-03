import { useState, useEffect } from 'react';
import './Closet.css';

function Closet() {
  const [clothes, setClothes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We'll add API call here later
    setLoading(false);
  }, []);

  return (
    <div className="closet">
      <h1>My Closet</h1>
      {loading ? (
        <p>Loading your wardrobe...</p>
      ) : (
        <div className="clothes-grid">
          <p>Your clothes will appear here</p>
        </div>
      )}
    </div>
  );
}

export default Closet;
