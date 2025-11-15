import { useState, useEffect } from 'react';
import ClothingCard from '../components/ClothingCard';
import { getAllClothes, deleteClothing } from '../services/api';
import './Closet.css';

function Closet() {
  const [clothes, setClothes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClothes();
  }, []);

  const fetchClothes = async () => {
    try {
      setLoading(true);
      const data = await getAllClothes();
      setClothes(data);
      setError(null);
    } catch (err) {
      setError('Failed to load clothing items. Using mock data for now.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteClothing(id);
        setClothes(clothes.filter(item => item._id !== id));
      } catch (err) {
        alert('Failed to delete item');
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="closet">
        <h1>My Closet</h1>
        <p className="loading">Loading your wardrobe...</p>
      </div>
    );
  }

  return (
    <div className="closet">
      <h1>My Closet</h1>
      {error && <p className="info-message">ℹ️ {error}</p>}
      {clothes.length === 0 ? (
        <div className="empty-state">
          <p>Your closet is empty!</p>
          <p>Add your first item to get started.</p>
        </div>
      ) : (
        <div className="clothes-grid">
          {clothes.map((item) => (
            <ClothingCard 
              key={item._id} 
              clothing={item} 
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Closet;
