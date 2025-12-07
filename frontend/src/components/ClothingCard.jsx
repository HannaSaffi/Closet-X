import './ClothingCard.css';

function ClothingCard({ clothing, onDelete }) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
  
  // Fix: Use imageUrl (lowercase) and add backend URL prefix
  const imageUrl = (clothing.processedImageUrl || clothing.imageUrl)
    ? `${API_BASE_URL}${clothing.processedImageUrl || clothing.imageUrl}`
    : 'https://via.placeholder.com/250';
    
  return (
    <div className="clothing-card">
      <div className="card-image">
        <img src={imageUrl} alt={clothing.category} />
      </div>
      <div className="card-content">
        <h3>{clothing.category}</h3>
        <div className="card-details">
          <span className="badge category">{clothing.category}</span>
          {clothing.color?.primary && (
            <span className="badge color">{clothing.color.primary}</span>
          )}
          {clothing.season && clothing.season.length > 0 && (
            <span className="badge season">{clothing.season[0]}</span>
          )}
        </div>
        {clothing.brand && <p className="brand">Brand: {clothing.brand}</p>}
      </div>
      <div className="card-actions">
        <button className="btn-delete" onClick={() => onDelete(clothing._id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default ClothingCard;