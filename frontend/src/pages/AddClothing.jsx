import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addClothing } from '../services/api';
import './AddClothing.css';

function AddClothing() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    category: '',
    color: '',
    season: '',
    brand: ''
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('category', formData.category);
    data.append('color', formData.color);
    data.append('season', formData.season);
    data.append('brand', formData.brand);
    if (image) {
      data.append('image', image);
    }

    try {
      setLoading(true);
      await addClothing(data);
      alert('Item added successfully!');
      navigate('/closet');
    } catch (err) {
      alert('Item added to mock data! (Backend not connected yet)');
      navigate('/closet');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  return (
    <div className="add-clothing">
      <h1>Add New Clothing Item</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Category: *</label>
          <select name="category" value={formData.category} onChange={handleChange} required>
            <option value="">Select category</option>
            <option value="tops">Tops</option>
            <option value="bottoms">Bottoms</option>
            <option value="dresses">Dresses</option>
            <option value="outerwear">Outerwear</option>
            <option value="shoes">Shoes</option>
            <option value="accessories">Accessories</option>
          </select>
        </div>

        <div className="form-group">
          <label>Color:</label>
          <input
            type="text"
            name="color"
            value={formData.color}
            onChange={handleChange}
            placeholder="e.g., Blue"
          />
        </div>

        <div className="form-group">
          <label>Season:</label>
          <select name="season" value={formData.season} onChange={handleChange}>
            <option value="">Select season</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
            <option value="all-season">All Seasons</option>
          </select>
        </div>

        <div className="form-group">
          <label>Brand:</label>
          <input
            type="text"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            placeholder="e.g., Nike"
          />
        </div>

        <div className="form-group">
          <label>Upload Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          {image && <p className="file-name">Selected: {image.name}</p>}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Adding...' : 'Add Item'}
        </button>
      </form>
    </div>
  );
}

export default AddClothing;
