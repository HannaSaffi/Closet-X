import { useState, useEffect } from 'react';
import './OutfitCalendar.css';

const OutfitCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [plannedOutfits, setPlannedOutfits] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [outfitNote, setOutfitNote] = useState('');

  // Load planned outfits from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('planned-outfits');
    if (saved) {
      setPlannedOutfits(JSON.parse(saved));
    }
  }, []);

  // Save planned outfits to localStorage
  useEffect(() => {
    localStorage.setItem('planned-outfits', JSON.stringify(plannedOutfits));
  }, [plannedOutfits]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleDateClick = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);
    const dateKey = formatDate(date);
    setOutfitNote(plannedOutfits[dateKey]?.note || '');
    setShowModal(true);
  };

  const handleSaveOutfit = () => {
    if (!selectedDate) return;
    
    const dateKey = formatDate(selectedDate);
    if (outfitNote.trim()) {
      setPlannedOutfits(prev => ({
        ...prev,
        [dateKey]: {
          note: outfitNote,
          createdAt: new Date().toISOString()
        }
      }));
    } else {
      // Remove if empty
      const newOutfits = { ...plannedOutfits };
      delete newOutfits[dateKey];
      setPlannedOutfits(newOutfits);
    }
    setShowModal(false);
    setOutfitNote('');
  };

  const handleDeleteOutfit = () => {
    if (!selectedDate) return;
    
    const dateKey = formatDate(selectedDate);
    const newOutfits = { ...plannedOutfits };
    delete newOutfits[dateKey];
    setPlannedOutfits(newOutfits);
    setShowModal(false);
    setOutfitNote('');
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateKey = formatDate(date);
      const hasOutfit = plannedOutfits[dateKey];
      const isToday = formatDate(new Date()) === dateKey;

      days.push(
        <div
          key={day}
          className={`calendar-day ${hasOutfit ? 'has-outfit' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          <span className="day-number">{day}</span>
          {hasOutfit && (
            <div className="outfit-indicator">
              <span className="outfit-emoji">👔</span>
              <span className="outfit-preview">{hasOutfit.note.substring(0, 20)}...</span>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="outfit-calendar">
      <h1>📅 Outfit Calendar</h1>
      <p className="subtitle">Plan your outfits for the week ahead</p>

      <div className="calendar-container">
        <div className="calendar-header">
          <button onClick={previousMonth} className="nav-button">
            ← Previous
          </button>
          <h2>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <button onClick={nextMonth} className="nav-button">
            Next →
          </button>
        </div>

        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="weekday">{day}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {renderCalendar()}
        </div>

        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color today-legend"></div>
            <span>Today</span>
          </div>
          <div className="legend-item">
            <div className="legend-color outfit-legend"></div>
            <span>Outfit Planned</span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              Plan Outfit for {selectedDate?.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            
            <div className="modal-form">
              <label htmlFor="outfit-note">Outfit Description</label>
              <textarea
                id="outfit-note"
                value={outfitNote}
                onChange={(e) => setOutfitNote(e.target.value)}
                placeholder="e.g., Blue jeans, white t-shirt, black jacket, sneakers"
                rows={4}
              />
              
              <div className="modal-hint">
                💡 Tip: Describe the outfit pieces you plan to wear, the occasion, or any styling notes.
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Cancel
              </button>
              {plannedOutfits[formatDate(selectedDate)]  && (
                <button onClick={handleDeleteOutfit} className="btn-danger">
                  Delete
                </button>
              )}
              <button onClick={handleSaveOutfit} className="btn-primary">
                {outfitNote.trim() ? 'Save' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="calendar-info">
        <h3>About Outfit Calendar</h3>
        <p>
          Plan your outfits in advance to save time and reduce decision fatigue. 
          Click on any day to add outfit notes. Your plans are saved locally in your browser.
        </p>
        <div className="stats-section">
          <div className="stat-box">
            <span className="stat-number">{Object.keys(plannedOutfits).length}</span>
            <span className="stat-label">Outfits Planned</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutfitCalendar;
