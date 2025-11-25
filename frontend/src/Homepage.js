import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';

const Homepage = () => {
  const navigate = useNavigate();
  const destinationsLoadedRef = useRef(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      try {
        setUserData(JSON.parse(storedUserData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('userData');
      }
    }
  }, []);

  useEffect(() => {
    // Load destinations only once when component mounts
    const loadDestinationsOnce = () => {
      if (!destinationsLoadedRef.current) {
        loadDestinations();
        destinationsLoadedRef.current = true;
      }
    };

    // Load after a short delay
    const timer = setTimeout(loadDestinationsOnce, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Initialize animations and scroll handling
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      const progressBar = document.querySelector('.progress-bar');
      const scrollTopBtn = document.querySelector('.scroll-top');
      const header = document.getElementById('header');
      
      if (progressBar) {
        progressBar.style.width = scrollPercent + '%';
      }
      
      if (scrollTopBtn) {
        if (scrollTop > 500) {
          scrollTopBtn.classList.add('visible');
        } else {
          scrollTopBtn.classList.remove('visible');
        }
      }
      
      if (header) {
        if (scrollTop > 50) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    };

    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    // Observe animated elements
    const animatedElements = document.querySelectorAll('[data-animate], .feature-card, .destination-card');
    animatedElements.forEach(el => observer.observe(el));

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  const loadDestinations = () => {
    const destinations = [
      { name: 'Goa', country: 'India', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&h=800&fit=crop' },
      { name: 'Mumbai', country: 'India', img: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=600&h=800&fit=crop' },
      { name: 'Delhi', country: 'India', img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&h=800&fit=crop' },
      { name: 'Bangalore', country: 'India', img: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=600&h=800&fit=crop' },
      { name: 'Chennai', country: 'India', img: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&h=800&fit=crop' },
      { name: 'Jaipur', country: 'India', img: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600&h=800&fit=crop' }
    ];

    const grid = document.getElementById('destinationsGrid');
    if (grid) {
      grid.innerHTML = '';

      destinations.forEach((dest, index) => {
        setTimeout(() => {
          const card = document.createElement('div');
          card.className = 'destination-card';
          card.innerHTML = `
            <img src="${dest.img}" alt="${dest.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x800/1a1a2e/e6d296?text=${dest.name}'" />
            <div class="destination-overlay">
              <h3>${dest.name}</h3>
              <div class="location">📍 ${dest.country}</div>
            </div>
          `;
          grid.appendChild(card);
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.classList.add('visible');
              }
            });
          });
          observer.observe(card);
        }, index * 100);
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    const offset = 85;
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    setUserData(null);
    // Force page refresh to update the UI
    window.location.reload();
  };

  // Add stagger animation delay to feature cards
  useEffect(() => {
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
      if (card) {
        card.style.animationDelay = `${index * 0.1}s`;
      }
    });
  }, []);

  return (
    <div className="homepage">
      {/* Progress Bar */}
      <div className="progress-bar"></div>

      {/* Header */}
      <header id="header" className="homepage-header">
        <div className="logo" onClick={() => navigate('/')}>ITINERARY</div>
        <nav>
          <ul>
            <li onClick={() => scrollToSection('hero')}>Home</li>
            <li onClick={() => scrollToSection('features')}>Features</li>
            <li onClick={() => scrollToSection('destinations')}>Destinations</li>
            <li onClick={() => scrollToSection('planner')}>About</li>
          </ul>
        </nav>
        <div className="auth-buttons">
          <button className="login-btn" onClick={userData ? handleDashboardClick : handleLoginClick}>
            {userData ? `Hi, ${userData.full_name?.split(' ')[0] || 'Dashboard'}` : 'Login'}
          </button>
          
          {/* Logout button (only show when logged in) */}
          {userData && (
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" id="hero">
        <div className="hero-content">
          <h1>Your Journey, Crafted With Ease</h1>
          <p>Plan your perfect itinerary—hotels, spas, zoos, adventures, and everything in between. One place, endless
            possibilities.</p>
          <button onClick={() => scrollToSection('planner')}>Learn More</button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <h2>Explore Everything</h2>
        <div className="features-grid">
          <div className="feature-card" data-animate>
            <div className="feature-icon">🏨</div>
            <p>Hotels</p>
          </div>
          <div className="feature-card" data-animate>
            <div className="feature-icon">💆</div>
            <p>Spa & Wellness</p>
          </div>
          <div className="feature-card" data-animate>
            <div className="feature-icon">🦁</div>
            <p>Zoos</p>
          </div>
          <div className="feature-card" data-animate>
            <div className="feature-icon">🍽️</div>
            <p>Restaurants</p>
          </div>
          <div className="feature-card" data-animate>
            <div className="feature-icon">🏔️</div>
            <p>Adventure</p>
          </div>
          <div className="feature-card" data-animate>
            <div className="feature-icon">🚌</div>
            <p>Transport</p>
          </div>
          <div className="feature-card" data-animate>
            <div className="feature-icon">🛍️</div>
            <p>Shopping</p>
          </div>
        </div>
      </section>

      {/* Destinations Section */}
      <section className="destinations-section" id="destinations">
        <h2>Popular Destinations</h2>
        <p>Discover breathtaking places around the world</p>
        <div className="destinations-grid" id="destinationsGrid">
          <div className="loader" style={{margin: '0 auto'}}></div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="planner-section" id="planner">
        <h2>About Us</h2>
        <div className="planner-container" style={{maxWidth: '900px'}}>
          <div style={{textAlign: 'center', marginBottom: '30px'}}>
            <div style={{fontSize: '64px', marginBottom: '20px'}}>✈️</div>
            <h3 style={{fontSize: '28px', color: 'var(--primary-color)', marginBottom: '15px'}}>Your Travel Companion
            </h3>
            <p style={{fontSize: '18px', lineHeight: '1.8', color: 'var(--text-light)', marginBottom: '30px'}}>
              At Itinerary, we believe that every journey should be extraordinary. We're passionate about helping
              travelers discover incredible destinations and create unforgettable memories.
            </p>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px', marginTop: '40px'}}>
            <div style={{textAlign: 'center', padding: '25px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)'}}>
              <div style={{fontSize: '48px', marginBottom: '15px'}}>🌍</div>
              <h4 style={{color: 'var(--text-light)', marginBottom: '10px', fontSize: '18px'}}>Global Coverage</h4>
              <p style={{color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6'}}>Explore destinations across
                India and beyond with our comprehensive travel guides</p>
            </div>

            <div style={{textAlign: 'center', padding: '25px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)'}}>
              <div style={{fontSize: '48px', marginBottom: '15px'}}>💎</div>
              <h4 style={{color: 'var(--text-light)', marginBottom: '10px', fontSize: '18px'}}>Premium Experience</h4>
              <p style={{color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6'}}>Handpicked hotels,
                restaurants, and experiences for discerning travelers</p>
            </div>

            <div style={{textAlign: 'center', padding: '25px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)'}}>
              <div style={{fontSize: '48px', marginBottom: '15px'}}>🤝</div>
              <h4 style={{color: 'var(--text-light)', marginBottom: '10px', fontSize: '18px'}}>24/7 Support</h4>
              <p style={{color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6'}}>Our dedicated team is always
                ready to assist you throughout your journey</p>
            </div>
          </div>

          <div style={{marginTop: '40px', padding: '30px', background: 'rgba(230,210,150,0.1)', borderRadius: '15px', border: '1px solid rgba(230,210,150,0.2)'}}>
            <h4 style={{color: 'var(--primary-color)', marginBottom: '15px', fontSize: '20px', textAlign: 'center'}}>Our
              Mission</h4>
            <p style={{color: 'var(--text-light)', fontSize: '16px', lineHeight: '1.8', textAlign: 'center'}}>
              We're dedicated to making travel planning effortless and enjoyable. From luxurious resorts to hidden
              local gems, from thrilling adventures to peaceful wellness retreats—we help you discover it all. Our
              platform brings together the best hotels, spas, restaurants, attractions, and transportation options
              to create your perfect itinerary.
            </p>
          </div>

          <div style={{textAlign: 'center', marginTop: '35px'}}>
            <p style={{color: 'var(--text-muted)', fontSize: '16px', lineHeight: '1.6'}}>
              Join thousands of happy travelers who have discovered their dream destinations with us.
              <span style={{color: 'var(--primary-color)', fontWeight: '600'}}> Your next adventure starts here!
                🌟</span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>&copy; 2025 Itinerary Planner. Your journey starts here.</p>
        <p>Crafted with ❤️ for travelers worldwide</p>
        <div className="social-links">
          <button aria-label="Facebook" style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>📘</button>
          <button aria-label="Instagram" style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>📷</button>
          <button aria-label="Twitter" style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>🐦</button>
        </div>
      </footer>

      {/* Scroll to Top */}
      <div className="scroll-top" onClick={scrollToTop}>
        ⬆️
      </div>
    </div>
  );
};

export default Homepage;