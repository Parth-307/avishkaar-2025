import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateTrip.css';

const CreateTrip = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    tripName: '',
    destination: '',
    groupSize: '',
    tripType: '',
    startDate: '',
    endDate: '',
    budgetPerPerson: '',
    currency: 'USD',
    flexibility: 'fixed',
    accommodation: 'hotel',
    dietaryRestrictions: '',
    specialRequests: '',
    activities: ''
  });

  const [dailyItinerary, setDailyItinerary] = useState([]);

  const totalSteps = 5;

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'radio' ? value : value
    }));
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      // Create trip using backend API
      const tripData = {
        admin_username: userData.username || 'admin',
        trip_name: formData.tripName
      };
      
      const response = await fetch('http://127.0.0.1:8000/trips/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tripData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update user data with new trip information
        const updatedUserData = {
          ...userData,
          trip_id: result.id,
          is_admin: true
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        
        alert('🎉 Trip Created Successfully!\n\nYour mood-adaptive journey has been created with a detailed itinerary. You can now invite group members and start your adventure!');
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        setSubmitError(errorData.detail || 'Failed to create trip. Please try again.');
      }
    } catch (error) {
      console.error('Trip creation error:', error);
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    const updateProgressBar = () => {
      document.querySelectorAll('.progress-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        
        if (stepNum < currentStep) {
          step.classList.add('completed');
        } else if (stepNum === currentStep) {
          step.classList.add('active');
        }
      });
    };

    updateProgressBar();
  }, [currentStep]);

  // Generate daily itinerary when dates change
  React.useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      
      if (dayDiff > 0 && dayDiff <= 30) { // Limit to 30 days for practical purposes
        const newItinerary = [];
        for (let i = 0; i < dayDiff; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);
          newItinerary.push({
            day: i + 1,
            date: currentDate.toISOString().split('T')[0],
            dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
            activities: [{
              name: '',
              startTime: '',
              endTime: '',
              description: ''
            }],
            notes: '',
            accommodation: ''
          });
        }
        setDailyItinerary(newItinerary);
      }
    }
  }, [formData.startDate, formData.endDate]);

  const handleItineraryChange = (dayIndex, field, value) => {
    const newItinerary = [...dailyItinerary];
    newItinerary[dayIndex][field] = value;
    setDailyItinerary(newItinerary);
  };

  const handleActivityChange = (dayIndex, activityIndex, field, value) => {
    const newItinerary = [...dailyItinerary];
    newItinerary[dayIndex].activities[activityIndex][field] = value;
    setDailyItinerary(newItinerary);
  };

  const addActivity = (dayIndex) => {
    const newItinerary = [...dailyItinerary];
    newItinerary[dayIndex].activities.push({
      name: '',
      startTime: '',
      endTime: '',
      description: ''
    });
    setDailyItinerary(newItinerary);
  };

  const removeActivity = (dayIndex, activityIndex) => {
    const newItinerary = [...dailyItinerary];
    if (newItinerary[dayIndex].activities.length > 1) {
      newItinerary[dayIndex].activities.splice(activityIndex, 1);
      setDailyItinerary(newItinerary);
    }
  };

  return (
    <div className="create-trip">
      <nav className="navbar">
        <div className="logo-nav">
          <div className="logo">🌍</div>
          <h2>Mood Pivot</h2>
        </div>
        <button onClick={handleGoBack} className="back-btn">← Back</button>
      </nav>

      <div className="container">
        <div className="header">
          <h1>Create Your Trip</h1>
          <p>Let's plan an unforgettable journey with mood-adaptive experiences</p>
        </div>

        <div className="progress-bar">
          <div className="progress-step" data-step="1">
            <div className="step-circle">1</div>
            <span className="step-label">Basic Info</span>
          </div>
          <div className="progress-step" data-step="2">
            <div className="step-circle">2</div>
            <span className="step-label">Dates & Budget</span>
          </div>
          <div className="progress-step" data-step="3">
            <div className="step-circle">3</div>
            <span className="step-label">Preferences</span>
          </div>
          <div className="progress-step" data-step="4">
            <div className="step-circle">4</div>
            <span className="step-label">Itinerary</span>
          </div>
          <div className="progress-step" data-step="5">
            <div className="step-circle">5</div>
            <span className="step-label">Review</span>
          </div>
        </div>

        <div className="form-card">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Information */}
            <div className={`form-section ${currentStep === 1 ? 'active' : ''}`} data-section="1">
              <h2 className="section-title">Basic Information</h2>

              <div className="form-group">
                <label htmlFor="tripName">Trip Name *</label>
                <input 
                  type="text" 
                  id="tripName" 
                  name="tripName"
                  placeholder="e.g., Summer Adventure 2024" 
                  value={formData.tripName}
                  onChange={handleInputChange}
                  required 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="destination">Destination *</label>
                  <input 
                    type="text" 
                    id="destination" 
                    name="destination"
                    placeholder="e.g., Bali, Indonesia" 
                    value={formData.destination}
                    onChange={handleInputChange}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="groupSize">Group Size *</label>
                  <input 
                    type="number" 
                    id="groupSize" 
                    name="groupSize"
                    placeholder="Number of travelers" 
                    min="1" 
                    value={formData.groupSize}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Trip Type *</label>
                <div className="radio-group">
                  <div className="radio-option">
                    <input 
                      type="radio" 
                      id="tripAdventure" 
                      name="tripType" 
                      value="adventure" 
                      checked={formData.tripType === 'adventure'}
                      onChange={handleInputChange}
                      required 
                    />
                    <label htmlFor="tripAdventure" className="radio-label">🏔️ Adventure</label>
                  </div>
                  <div className="radio-option">
                    <input 
                      type="radio" 
                      id="tripRelaxation" 
                      name="tripType" 
                      value="relaxation"
                      checked={formData.tripType === 'relaxation'}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="tripRelaxation" className="radio-label">🏖️ Relaxation</label>
                  </div>
                  <div className="radio-option">
                    <input 
                      type="radio" 
                      id="tripCultural" 
                      name="tripType" 
                      value="cultural"
                      checked={formData.tripType === 'cultural'}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="tripCultural" className="radio-label">🏛️ Cultural</label>
                  </div>
                  <div className="radio-option">
                    <input 
                      type="radio" 
                      id="tripFamily" 
                      name="tripType" 
                      value="family"
                      checked={formData.tripType === 'family'}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="tripFamily" className="radio-label">👨‍👩‍👧‍👦 Family</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Dates & Budget */}
            <div className={`form-section ${currentStep === 2 ? 'active' : ''}`} data-section="2">
              <h2 className="section-title">Dates & Budget</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Start Date *</label>
                  <input 
                    type="date" 
                    id="startDate" 
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endDate">End Date *</label>
                  <input 
                    type="date" 
                    id="endDate" 
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="budgetPerPerson">Budget Per Person ($) *</label>
                  <input 
                    type="number" 
                    id="budgetPerPerson" 
                    name="budgetPerPerson"
                    placeholder="2000" 
                    min="0" 
                    value={formData.budgetPerPerson}
                    onChange={handleInputChange}
                    required 
                  />
                  <p className="helper-text">Includes accommodation, activities, and meals</p>
                </div>

                <div className="form-group">
                  <label htmlFor="currency">Currency</label>
                  <select 
                    id="currency" 
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="flexibility">Date Flexibility</label>
                <select 
                  id="flexibility" 
                  name="flexibility"
                  value={formData.flexibility}
                  onChange={handleInputChange}
                >
                  <option value="fixed">Fixed dates</option>
                  <option value="1-2">±1-2 days</option>
                  <option value="3-5">±3-5 days</option>
                  <option value="flexible">Very flexible</option>
                </select>
              </div>
            </div>

            {/* Step 3: Preferences */}
            <div className={`form-section ${currentStep === 3 ? 'active' : ''}`} data-section="3">
              <h2 className="section-title">Trip Preferences</h2>

              <div className="form-group">
                <label>Accommodation Type</label>
                <div className="radio-group">
                  <div className="radio-option">
                    <input 
                      type="radio" 
                      id="accomHotel" 
                      name="accommodation" 
                      value="hotel" 
                      checked={formData.accommodation === 'hotel'}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="accomHotel" className="radio-label">🏨 Hotel</label>
                  </div>
                  <div className="radio-option">
                    <input 
                      type="radio" 
                      id="accomHostel" 
                      name="accommodation" 
                      value="hostel"
                      checked={formData.accommodation === 'hostel'}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="accomHostel" className="radio-label">🛏️ Hostel</label>
                  </div>
                  <div className="radio-option">
                    <input 
                      type="radio" 
                      id="accomResort" 
                      name="accommodation" 
                      value="resort"
                      checked={formData.accommodation === 'resort'}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="accomResort" className="radio-label">🏝️ Resort</label>
                  </div>
                  <div className="radio-option">
                    <input 
                      type="radio" 
                      id="accomAirbnb" 
                      name="accommodation" 
                      value="airbnb"
                      checked={formData.accommodation === 'airbnb'}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="accomAirbnb" className="radio-label">🏡 Airbnb</label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dietaryRestrictions">Dietary Restrictions (Optional)</label>
                <input 
                  type="text" 
                  id="dietaryRestrictions" 
                  name="dietaryRestrictions"
                  placeholder="e.g., Vegetarian, Gluten-free, Halal"
                  value={formData.dietaryRestrictions}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="specialRequests">Special Requests or Notes (Optional)</label>
                <textarea 
                  id="specialRequests" 
                  name="specialRequests"
                  placeholder="Any specific requirements, accessibility needs, or preferences..."
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="activities">Preferred Activities (Optional)</label>
                <textarea 
                  id="activities" 
                  name="activities"
                  placeholder="e.g., Hiking, Scuba diving, Museum visits, Local cuisine tours..."
                  value={formData.activities}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Step 4: Itinerary */}
            <div className={`form-section ${currentStep === 4 ? 'active' : ''}`} data-section="4">
              <h2 className="section-title">Daily Itinerary</h2>
              <p className="helper-text" style={{marginBottom: '24px'}}>Plan activities for each day of your trip.</p>

              {(!formData.startDate || !formData.endDate) ? (
                <div className="itinerary-placeholder">
                  <p style={{color: 'var(--color-text-secondary)', textAlign: 'center', padding: '40px 0'}}>
                    Please complete the basic information and dates in previous steps to generate daily itinerary sections.
                  </p>
                </div>
              ) : (
                <div className="daily-itinerary">
                  {dailyItinerary.map((day, dayIndex) => (
                    <div key={dayIndex} className="day-card">
                      <div className="day-header">
                        <h3>Day {day.day}</h3>
                        <span className="day-date">{day.date} - {day.dayName}</span>
                      </div>
                      
                      <div className="form-group">
                        <label>Activities</label>
                        {day.activities.map((activity, activityIndex) => (
                          <div key={activityIndex} className="activity-time-block">
                            <div className="activity-time-row">
                              <div className="time-input-group">
                                <label>From</label>
                                <input
                                  type="time"
                                  value={activity.startTime}
                                  onChange={(e) => handleActivityChange(dayIndex, activityIndex, 'startTime', e.target.value)}
                                  className="time-input"
                                />
                              </div>
                              <div className="time-input-group">
                                <label>To</label>
                                <input
                                  type="time"
                                  value={activity.endTime}
                                  onChange={(e) => handleActivityChange(dayIndex, activityIndex, 'endTime', e.target.value)}
                                  className="time-input"
                                />
                              </div>
                            </div>
                            <div className="activity-details">
                              <input
                                type="text"
                                placeholder={`Activity ${activityIndex + 1} name`}
                                value={activity.name}
                                onChange={(e) => handleActivityChange(dayIndex, activityIndex, 'name', e.target.value)}
                                className="activity-name-input"
                              />
                              <textarea
                                placeholder="Activity description (optional)"
                                value={activity.description}
                                onChange={(e) => handleActivityChange(dayIndex, activityIndex, 'description', e.target.value)}
                                className="activity-description-input"
                                rows="2"
                              />
                            </div>
                            {day.activities.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeActivity(dayIndex, activityIndex)}
                                className="btn-remove-activity"
                              >
                                ✕ Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addActivity(dayIndex)}
                          className="btn-add-activity"
                        >
                          + Add Another Activity
                        </button>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Accommodation</label>
                          <input
                            type="text"
                            placeholder="Hotel, hostel, or other"
                            value={day.accommodation}
                            onChange={(e) => handleItineraryChange(dayIndex, 'accommodation', e.target.value)}
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Notes (Optional)</label>
                          <input
                            type="text"
                            placeholder="Special notes or reminders"
                            value={day.notes}
                            onChange={(e) => handleItineraryChange(dayIndex, 'notes', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 5: Review */}
            <div className={`form-section ${currentStep === 5 ? 'active' : ''}`} data-section="5">
              <h2 className="section-title">Review Your Trip</h2>

              <div className="review-content">
                <div className="review-section">
                  <h3 style={{color: 'var(--color-primary)', marginBottom: '16px', fontSize: '18px'}}>📍 Trip Details</h3>
                  <p><strong>Trip Name:</strong> {formData.tripName || 'Not specified'}</p>
                  <p><strong>Destination:</strong> {formData.destination || 'Not specified'}</p>
                  <p><strong>Group Size:</strong> {formData.groupSize || 'Not specified'} travelers</p>
                  <p><strong>Trip Type:</strong> {formData.tripType || 'Not specified'}</p>
                </div>
                
                <div className="review-section">
                  <h3 style={{color: 'var(--color-primary)', marginBottom: '16px', fontSize: '18px'}}>📅 Schedule & Budget</h3>
                  <p><strong>Start Date:</strong> {formData.startDate || 'Not set'}</p>
                  <p><strong>End Date:</strong> {formData.endDate || 'Not set'}</p>
                  <p><strong>Budget:</strong> {formData.currency} {formData.budgetPerPerson || '0'} per person</p>
                  <p><strong>Accommodation:</strong> {formData.accommodation || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handlePrevStep}
                style={{ display: currentStep === 1 ? 'none' : 'block' }}
              >
                ← Previous
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleNextStep}
                style={{ display: currentStep === totalSteps ? 'none' : 'block' }}
              >
                Next →
              </button>
              
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ display: currentStep === totalSteps ? 'block' : 'none' }}
              >
                {isSubmitting ? 'Creating Trip...' : 'Create Trip 🚀'}
              </button>
            </div>
            
            {submitError && (
              <div style={{
                background: 'rgba(192, 21, 47, 0.1)',
                color: '#c0152f',
                padding: '12px 16px',
                borderRadius: '8px',
                marginTop: '16px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {submitError}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTrip;