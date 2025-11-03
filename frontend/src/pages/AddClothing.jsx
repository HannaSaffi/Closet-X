import { useState } from 'react';
import './AddClothing.css';

function AddClothing() {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    color: '',
    season: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // We'll add API call here later
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="add-clothing">
      <h1>Add New Clothing Item</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Item Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Blue Denim Jacket"
            required
          />
        </div>

        <div className="form-group">
          <label>Category:</label>
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
            <option value="all">All Seasons</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary">Add Item</button>
      </form>
    </div>
  );
}

export default AddClothing;
