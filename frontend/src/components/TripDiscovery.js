import React, { useState, useEffect } from 'react';
import './TripDiscovery.css';

const TripDiscovery = ({ onNavigate, onJoinTrip }) => {
  const [activeTab, setActiveTab] = useState('featured'); // featured, search, nearby
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [featuredTrips, setFeaturedTrips] = useState([]);
  const [nearbyTrips, setNearbyTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    maxParticipants: '',
    activityType: '',
    duration: ''
  });

  // Load initial data
  useEffect(() => {
    loadFeaturedTrips();
    loadNearbyTrips();
  }, []);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, filters]);

  const loadFeaturedTrips = async () => {
    try {
      setIsLoading(true);
      // Mock data for featured trips
      const featured = [
        {
          id: 1,
          name: "Weekend Mountain Adventure",
          description: "Hiking and camping in the beautiful Rocky Mountains",
          organizer: "AdventureSeeker",
          participants: 8,
          maxParticipants: 12,
          joinCode: "MTN123",
          location: "Colorado Rockies",
          activityTypes: ["hiking", "camping", "photography"],
          duration: "2 days",
          tags: ["outdoor", "adventure", "nature"],
          featured: true,
          image: "🏔️"
        },
        {
          id: 2,
          name: "City Food Tour",
          description: "Explore the best restaurants and street food in downtown",
          organizer: "FoodLover2024",
          participants: 15,
          maxParticipants: 20,
          joinCode: "FD456",
          location: "Downtown Area",
          activityTypes: ["food", "walking", "culture"],
          duration: "4 hours",
          tags: ["food", "city", "culture"],
          featured: true,
          image: "🍕"
        },
        {
          id: 3,
          name: "Beach Volleyball Tournament",
          description: "Competitive and casual volleyball on the sunny beach",
          organizer: "BeachGames",
          participants: 22,
          maxParticipants: 24,
          joinCode: "BV789",
          location: "Sunny Beach",
          activityTypes: ["sports", "beach", "competition"],
          duration: "1 day",
          tags: ["sports", "beach", "competitive"],
          featured: true,
          image: "🏐"
        }
      ];
      setFeaturedTrips(featured);
    } catch (err) {
      setError('Failed to load featured trips');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNearbyTrips = async () => {
    try {
      setIsLoading(true);
      // Mock data for nearby trips based on location
      const nearby = [
        {
          id: 4,
          name: "Local Coffee Shop Crawl",
          description: "Discover hidden gems in your neighborhood",
          organizer: "LocalExplorer",
          participants: 5,
          maxParticipants: 8,
          joinCode: "CF101",
          location: "Your Area",
          activityTypes: ["food", "social", "local"],
          duration: "3 hours",
          tags: ["local", "coffee", "social"],
          distance: "0.8 km away",
          nearby: true,
          image: "☕"
        },
        {
          id: 5,
          name: "Museum Art Walk",
          description: "Guided tour through contemporary art exhibitions",
          organizer: "ArtEnthusiast",
          participants: 12,
          maxParticipants: 15,
          joinCode: "MW202",
          location: "City Museum District",
          activityTypes: ["culture", "art", "education"],
          duration: "2 hours",
          tags: ["art", "culture", "educational"],
          distance: "2.1 km away",
          nearby: true,
          image: "🎨"
        }
      ];
      setNearbyTrips(nearby);
    } catch (err) {
      setError('Failed to load nearby trips');
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Mock search results - in real app would call backend API
      let results = [];

      // Search through featured trips
      if (activeTab === 'featured' || activeTab === 'search') {
        const featuredMatches = featuredTrips.filter(trip => {
          const matchesQuery = !searchQuery || 
            trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.activityTypes.some(type => type.toLowerCase().includes(searchQuery.toLowerCase())) ||
            trip.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

          const matchesFilters = 
            (!filters.maxParticipants || trip.maxParticipants <= parseInt(filters.maxParticipants)) &&
            (!filters.activityType || trip.activityTypes.includes(filters.activityType)) &&
            (!filters.duration || trip.duration.toLowerCase().includes(filters.duration.toLowerCase()));

          return matchesQuery && matchesFilters;
        });
        results = [...results, ...featuredMatches];
      }

      // Search through nearby trips
      if (activeTab === 'nearby' || activeTab === 'search') {
        const nearbyMatches = nearbyTrips.filter(trip => {
          const matchesQuery = !searchQuery || 
            trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.activityTypes.some(type => type.toLowerCase().includes(searchQuery.toLowerCase())) ||
            trip.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

          const matchesFilters = 
            (!filters.maxParticipants || trip.maxParticipants <= parseInt(filters.maxParticipants)) &&
            (!filters.activityType || trip.activityTypes.includes(filters.activityType)) &&
            (!filters.duration || trip.duration.toLowerCase().includes(filters.duration.toLowerCase()));

          return matchesQuery && matchesFilters;
        });
        results = [...results, ...nearbyMatches];
      }

      // Remove duplicates
      results = results.filter((trip, index, self) => 
        index === self.findIndex(t => t.id === trip.id)
      );

      setSearchResults(results);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTrip = (trip) => {
    if (onJoinTrip) {
      onJoinTrip(trip);
    } else {
      onNavigate('join', { joinCode: trip.joinCode });
    }
  };

  const getCurrentTrips = () => {
    if (activeTab === 'search') {
      return searchResults;
    } else if (activeTab === 'nearby') {
      return nearbyTrips;
    } else {
      return featuredTrips;
    }
  };

  const clearFilters = () => {
    setFilters({
      maxParticipants: '',
      activityType: '',
      duration: ''
    });
    setSearchQuery('');
  };

  const renderTripCard = (trip) => (
    <div key={trip.id} className="trip-card">
      <div className="trip-image">
        <span className="trip-emoji">{trip.image}</span>
        {trip.featured && <div className="featured-badge">Featured</div>}
        {trip.nearby && <div className="nearby-badge">Nearby</div>}
      </div>
      
      <div className="trip-content">
        <div className="trip-header">
          <h3 className="trip-name">{trip.name}</h3>
          <div className="trip-organizer">
            by <span className="organizer-name">@{trip.organizer}</span>
          </div>
        </div>
        
        <p className="trip-description">{trip.description}</p>
        
        <div className="trip-meta">
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            <span>{trip.location}</span>
            {trip.distance && <span className="distance">{trip.distance}</span>}
          </div>
          
          <div className="meta-item">
            <span className="meta-icon">👥</span>
            <span>{trip.participants}/{trip.maxParticipants} participants</span>
          </div>
          
          <div className="meta-item">
            <span className="meta-icon">⏰</span>
            <span>{trip.duration}</span>
          </div>
        </div>
        
        <div className="trip-tags">
          {trip.activityTypes.map((type, index) => (
            <span key={index} className="tag activity-type">{type}</span>
          ))}
          {trip.tags.map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>
        
        <div className="trip-actions">
          <button 
            className="join-btn"
            onClick={() => handleJoinTrip(trip)}
            disabled={trip.participants >= trip.maxParticipants}
          >
            {trip.participants >= trip.maxParticipants ? 'Full' : 'Join Trip'}
          </button>
          
          <button 
            className="preview-btn"
            onClick={() => onNavigate('trip-preview', { tripId: trip.id })}
          >
            Preview
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="trip-discovery">
      {/* Header */}
      <div className="discovery-header">
        <div className="header-content">
          <h1>Discover Trips</h1>
          <p>Find amazing trips and adventures near you</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="create-trip-btn"
            onClick={() => onNavigate('create-trip')}
          >
            ➕ Create Your Trip
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-section">
        <div className="search-bar">
          <div className="search-input-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trips, locations, activities..."
              className="search-input"
            />
          </div>
          
          <button 
            className="search-btn"
            onClick={performSearch}
            disabled={isLoading}
          >
            {isLoading ? '⏳' : 'Search'}
          </button>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filters-title">Filters</div>
          
          <div className="filters-row">
            <select 
              value={filters.maxParticipants}
              onChange={(e) => setFilters(prev => ({ ...prev, maxParticipants: e.target.value }))}
              className="filter-select"
            >
              <option value="">Max Participants</option>
              <option value="5">Up to 5</option>
              <option value="10">Up to 10</option>
              <option value="15">Up to 15</option>
              <option value="20">Up to 20</option>
              <option value="25">Up to 25</option>
            </select>
            
            <select 
              value={filters.activityType}
              onChange={(e) => setFilters(prev => ({ ...prev, activityType: e.target.value }))}
              className="filter-select"
            >
              <option value="">Activity Type</option>
              <option value="outdoor">Outdoor</option>
              <option value="food">Food</option>
              <option value="sports">Sports</option>
              <option value="culture">Culture</option>
              <option value="adventure">Adventure</option>
              <option value="social">Social</option>
            </select>
            
            <select 
              value={filters.duration}
              onChange={(e) => setFilters(prev => ({ ...prev, duration: e.target.value }))}
              className="filter-select"
            >
              <option value="">Duration</option>
              <option value="hour">1-3 hours</option>
              <option value="day">Half day</option>
              <option value="days">Multiple days</option>
            </select>
            
            <button 
              className="clear-filters-btn"
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="discovery-tabs">
        <button 
          className={`tab ${activeTab === 'featured' ? 'active' : ''}`}
          onClick={() => setActiveTab('featured')}
        >
          ⭐ Featured
        </button>
        
        <button 
          className={`tab ${activeTab === 'nearby' ? 'active' : ''}`}
          onClick={() => setActiveTab('nearby')}
        >
          📍 Nearby
        </button>
        
        <button 
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search Results
          {searchQuery && searchResults.length > 0 && (
            <span className="result-count">({searchResults.length})</span>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
          <button 
            className="dismiss-error"
            onClick={() => setError('')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Trip Grid */}
      <div className="trips-grid">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <p>Loading trips...</p>
          </div>
        ) : getCurrentTrips().length > 0 ? (
          getCurrentTrips().map(renderTripCard)
        ) : activeTab === 'search' ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No trips found</h3>
            <p>Try adjusting your search terms or filters</p>
            <button 
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery('');
                clearFilters();
              }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No trips available</h3>
            <p>Be the first to create an amazing trip!</p>
            <button 
              className="create-first-btn"
              onClick={() => onNavigate('create-trip')}
            >
              Create First Trip
            </button>
          </div>
        )}
      </div>

      {/* Trending Tags */}
      {!searchQuery && (
        <div className="trending-section">
          <h3>Trending Activities</h3>
          <div className="trending-tags">
            {['#hiking', '#food', '#photography', '#music', '#art', '#sports', '#adventure', '#culture'].map(tag => (
              <button 
                key={tag}
                className="trending-tag"
                onClick={() => {
                  setSearchQuery(tag.substring(1));
                  setActiveTab('search');
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDiscovery;