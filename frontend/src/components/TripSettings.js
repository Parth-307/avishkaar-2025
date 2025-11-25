import React, { useState, useEffect } from 'react';
import './TripSettings.css';

const TripSettings = ({ user, tripData, onNavigate }) => {
  const [settings, setSettings] = useState({
    tripName: '',
    tripDescription: '',
    isPrivate: false,
    maxParticipants: 10,
    autoStartActivities: false,
    requireFeedback: true,
    aiOptimization: true,
    feedbackTimeout: 300, // 5 minutes
    activityDuration: 60, // 60 minutes
    costLimit: 50, // $50 per activity
    allowLocationSharing: false,
    emergencyContacts: [],
    customSettings: {}
  });

  const [participants, setParticipants] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Load current settings on mount
  useEffect(() => {
    if (tripData) {
      loadTripSettings();
      fetchParticipants();
    }
  }, [tripData]);

  const loadTripSettings = () => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem(`trip_settings_${user.trip_id}`);
    
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({
        tripName: tripData?.name || '',
        tripDescription: parsed.tripDescription || '',
        isPrivate: parsed.isPrivate || false,
        maxParticipants: parsed.maxParticipants || 10,
        autoStartActivities: parsed.autoStartActivities || false,
        requireFeedback: parsed.requireFeedback !== false,
        aiOptimization: parsed.aiOptimization !== false,
        feedbackTimeout: parsed.feedbackTimeout || 300,
        activityDuration: parsed.activityDuration || 60,
        costLimit: parsed.costLimit || 50,
        allowLocationSharing: parsed.allowLocationSharing || false,
        emergencyContacts: parsed.emergencyContacts || [],
        customSettings: parsed.customSettings || {}
      });
    } else {
      // Set default values
      setSettings(prev => ({
        ...prev,
        tripName: tripData?.name || ''
      }));
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/trips/${user.trip_id}/participants`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants);
        initializeRoles(data.participants);
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  };

  const initializeRoles = (participantList) => {
    // Initialize roles based on participants
    const participantRoles = participantList.map(p => ({
      userId: p.id,
      username: p.username,
      fullName: p.full_name,
      role: p.is_admin ? 'admin' : 'participant',
      permissions: p.is_admin ? ['view', 'edit', 'manage', 'delete'] : ['view', 'vote'],
      joinedAt: p.created_at,
      lastActive: p.updated_at
    }));
    setRoles(participantRoles);
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
    setSaveStatus('');
  };

  const handleArrayUpdate = (key, index, value, action = 'update') => {
    setSettings(prev => {
      const array = [...prev[key]];
      if (action === 'add') {
        array.push(value);
      } else if (action === 'remove') {
        array.splice(index, 1);
      } else {
        array[index] = value;
      }
      return {
        ...prev,
        [key]: array
      };
    });
    setHasChanges(true);
    setSaveStatus('');
  };

  const saveSettings = async () => {
    setIsLoading(true);
    
    try {
      // In a real implementation, this would save to the backend
      // For now, we'll use localStorage
      const settingsToSave = { ...settings };
      localStorage.setItem(`trip_settings_${user.trip_id}`, JSON.stringify(settingsToSave));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasChanges(false);
      setSaveStatus('saved');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
      
    } catch (error) {
      setSaveStatus('error');
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addEmergencyContact = () => {
    const newContact = {
      id: Date.now(),
      name: '',
      phone: '',
      email: '',
      relationship: ''
    };
    handleArrayUpdate('emergencyContacts', 0, newContact, 'add');
  };

  const updateEmergencyContact = (index, field, value) => {
    const updatedContact = { ...settings.emergencyContacts[index], [field]: value };
    handleArrayUpdate('emergencyContacts', index, updatedContact);
  };

  const removeEmergencyContact = (index) => {
    handleArrayUpdate('emergencyContacts', index, null, 'remove');
  };

  const updateParticipantRole = (userId, newRole) => {
    setRoles(prev => prev.map(role => 
      role.userId === userId 
        ? { 
            ...role, 
            role: newRole,
            permissions: newRole === 'admin' 
              ? ['view', 'edit', 'manage', 'delete'] 
              : ['view', 'vote']
          }
        : role
    ));
    setHasChanges(true);
  };

  const exportTripData = async () => {
    try {
      setIsLoading(true);
      
      // Collect all trip data
      const tripExportData = {
        trip: tripData,
        settings: settings,
        participants: participants,
        roles: roles,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      // Create and download JSON file
      const dataStr = JSON.stringify(tripExportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `trip-${tripData.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      setSaveStatus('exported');
    } catch (error) {
      console.error('Failed to export trip data:', error);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const archiveTrip = async () => {
    if (window.confirm('Are you sure you want to archive this trip? This action can be reversed, but participants will lose access.')) {
      try {
        setIsLoading(true);
        
        // In a real implementation, this would call the backend API
        const response = await fetch(`/api/trips/${user.trip_id}/archive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin_id: user.id,
            reason: 'Manual archive from settings'
          }),
        });

        if (response.ok) {
          setSaveStatus('archived');
          // Redirect to home page after archiving
          setTimeout(() => {
            onNavigate('home');
          }, 2000);
        } else {
          throw new Error('Archive failed');
        }
      } catch (error) {
        console.error('Failed to archive trip:', error);
        setSaveStatus('error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>General Trip Information</h3>
      
      <div className="form-group">
        <label htmlFor="tripName">Trip Name</label>
        <input
          type="text"
          id="tripName"
          value={settings.tripName}
          onChange={(e) => handleSettingChange('tripName', e.target.value)}
          placeholder="Enter trip name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="tripDescription">Description</label>
        <textarea
          id="tripDescription"
          value={settings.tripDescription}
          onChange={(e) => handleSettingChange('tripDescription', e.target.value)}
          placeholder="Describe your trip..."
          rows="4"
        />
      </div>

      <div className="form-group">
        <label htmlFor="maxParticipants">Maximum Participants</label>
        <input
          type="number"
          id="maxParticipants"
          min="1"
          max="50"
          value={settings.maxParticipants}
          onChange={(e) => handleSettingChange('maxParticipants', parseInt(e.target.value))}
        />
        <small>Current: {participants.length} participants</small>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.isPrivate}
            onChange={(e) => handleSettingChange('isPrivate', e.target.checked)}
          />
          <span className="checkmark"></span>
          Private Trip
        </label>
        <small>Private trips require admin approval to join</small>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.allowLocationSharing}
            onChange={(e) => handleSettingChange('allowLocationSharing', e.target.checked)}
          />
          <span className="checkmark"></span>
          Allow Location Sharing
        </label>
        <small>Enable location sharing between participants</small>
      </div>
    </div>
  );

  const renderActivitySettings = () => (
    <div className="settings-section">
      <h3>Activity Configuration</h3>
      
      <div className="form-group">
        <label htmlFor="activityDuration">Default Activity Duration (minutes)</label>
        <input
          type="number"
          id="activityDuration"
          min="15"
          max="480"
          value={settings.activityDuration}
          onChange={(e) => handleSettingChange('activityDuration', parseInt(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="costLimit">Cost Limit per Activity ($)</label>
        <input
          type="number"
          id="costLimit"
          min="0"
          max="1000"
          value={settings.costLimit}
          onChange={(e) => handleSettingChange('costLimit', parseInt(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="feedbackTimeout">Feedback Timeout (seconds)</label>
        <input
          type="number"
          id="feedbackTimeout"
          min="60"
          max="1800"
          value={settings.feedbackTimeout}
          onChange={(e) => handleSettingChange('feedbackTimeout', parseInt(e.target.value))}
        />
        <small>Time to wait for feedback before auto-proceeding</small>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.autoStartActivities}
            onChange={(e) => handleSettingChange('autoStartActivities', e.target.checked)}
          />
          <span className="checkmark"></span>
          Auto-start Next Activity
        </label>
        <small>Automatically start the next scheduled activity</small>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.requireFeedback}
            onChange={(e) => handleSettingChange('requireFeedback', e.target.checked)}
          />
          <span className="checkmark"></span>
          Require Feedback
        </label>
        <small>Participants must submit feedback to proceed</small>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className="settings-section">
      <h3>AI & Automation</h3>
      
      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.aiOptimization}
            onChange={(e) => handleSettingChange('aiOptimization', e.target.checked)}
          />
          <span className="checkmark"></span>
          AI Optimization
        </label>
        <small>Enable AI-powered activity recommendations and optimizations</small>
      </div>

      <div className="ai-preview">
        <h4>AI Features Status</h4>
        <div className="feature-grid">
          <div className="feature-item">
            <div className="feature-icon">🧠</div>
            <div className="feature-info">
              <div className="feature-name">Smart Recommendations</div>
              <div className="feature-status active">Active</div>
            </div>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <div className="feature-info">
              <div className="feature-name">Fatigue Detection</div>
              <div className="feature-status active">Active</div>
            </div>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">🎯</div>
            <div className="feature-info">
              <div className="feature-name">Activity Optimization</div>
              <div className="feature-status active">Active</div>
            </div>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <div className="feature-info">
              <div className="feature-name">Mood Analysis</div>
              <div className="feature-status active">Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderParticipantManagement = () => (
    <div className="settings-section">
      <h3>Participant Management</h3>
      
      <div className="participants-list">
        {roles.map((role) => (
          <div key={role.userId} className="participant-role-item">
            <div className="participant-info">
              <div className="participant-name">{role.fullName}</div>
              <div className="participant-username">@{role.username}</div>
              <div className="participant-joined">
                Joined: {new Date(role.joinedAt).toLocaleDateString()}
              </div>
            </div>
            
            <div className="role-controls">
              <select
                value={role.role}
                onChange={(e) => updateParticipantRole(role.userId, e.target.value)}
                disabled={role.userId === user.id} // Can't change own role
              >
                <option value="participant">Participant</option>
                <option value="admin">Administrator</option>
                <option value="observer">Observer</option>
              </select>
              
              <div className="permissions-list">
                {role.permissions.map(permission => (
                  <span key={permission} className="permission-badge">
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEmergencySettings = () => (
    <div className="settings-section">
      <h3>Emergency Contacts</h3>
      
      <div className="emergency-contacts">
        {settings.emergencyContacts.map((contact, index) => (
          <div key={contact.id} className="contact-item">
            <div className="contact-fields">
              <input
                type="text"
                placeholder="Name"
                value={contact.name}
                onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
              />
              <input
                type="tel"
                placeholder="Phone"
                value={contact.phone}
                onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                value={contact.email}
                onChange={(e) => updateEmergencyContact(index, 'email', e.target.value)}
              />
              <input
                type="text"
                placeholder="Relationship"
                value={contact.relationship}
                onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
              />
            </div>
            <button
              className="remove-contact-btn"
              onClick={() => removeEmergencyContact(index)}
            >
              🗑️
            </button>
          </div>
        ))}
        
        <button className="add-contact-btn" onClick={addEmergencyContact}>
          ➕ Add Emergency Contact
        </button>
      </div>
    </div>
  );

  const renderAdministrativeActions = () => (
    <div className="settings-section">
      <h3>Administrative Actions</h3>
      
      <div className="admin-actions">
        <div className="action-group">
          <h4>Data Management</h4>
          <button 
            className="action-btn secondary"
            onClick={exportTripData}
            disabled={isLoading}
          >
            📤 Export Trip Data
          </button>
          <p className="action-description">
            Download a complete backup of your trip data including participants, activities, and settings
          </p>
        </div>

        <div className="action-group">
          <h4>Danger Zone</h4>
          <button 
            className="action-btn danger"
            onClick={archiveTrip}
            disabled={isLoading}
          >
            🗄️ Archive Trip
          </button>
          <p className="action-description">
            Archive this trip. Participants will lose access, but data will be preserved
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="trip-settings">
      {/* Header */}
      <div className="settings-header">
        <div className="header-left">
          <h1>⚙️ Trip Settings</h1>
          <p className="header-subtitle">
            Configure your trip preferences and manage participants
          </p>
        </div>
        
        <div className="header-right">
          {hasChanges && (
            <div className="changes-indicator">
              ⚠️ Unsaved Changes
            </div>
          )}
          
          <button 
            className={`save-btn ${hasChanges ? 'primary' : 'secondary'}`}
            onClick={saveSettings}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? '💾 Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div className={`save-status ${saveStatus}`}>
          {saveStatus === 'saved' && '✅ Settings saved successfully'}
          {saveStatus === 'error' && '❌ Failed to save settings'}
          {saveStatus === 'exported' && '📤 Trip data exported successfully'}
          {saveStatus === 'archived' && '🗄️ Trip archived successfully'}
        </div>
      )}

      {/* Settings Content */}
      <div className="settings-content">
        {/* Settings Navigation */}
        <div className="settings-nav">
          <button 
            className={`nav-item ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            🏠 General
          </button>
          <button 
            className={`nav-item ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            📅 Activities
          </button>
          <button 
            className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            🤖 AI & Automation
          </button>
          <button 
            className={`nav-item ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            👥 Participants
          </button>
          <button 
            className={`nav-item ${activeTab === 'emergency' ? 'active' : ''}`}
            onClick={() => setActiveTab('emergency')}
          >
            🆘 Emergency
          </button>
          <button 
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            🔧 Admin
          </button>
        </div>

        {/* Settings Forms */}
        <div className="settings-forms">
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'activities' && renderActivitySettings()}
          {activeTab === 'ai' && renderAISettings()}
          {activeTab === 'participants' && renderParticipantManagement()}
          {activeTab === 'emergency' && renderEmergencySettings()}
          {activeTab === 'admin' && renderAdministrativeActions()}
        </div>
      </div>
    </div>
  );
};

export default TripSettings;