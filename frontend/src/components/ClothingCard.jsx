import './ClothingCard.css';

function ClothingCard({ clothing, onDelete }) {
  const imageUrl = clothing.imageURL || 'https://via.placeholder.com/250';

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
