import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, BarChart3, Activity, Users, ArrowRight, Menu, X } from 'lucide-react';
import './Home.css';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="home-container">
      {/* Navigation Bar */}
      <nav className="home-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="brand-icon-wrapper">
              <ShieldCheck className="brand-icon" />
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Compliance Calculator</h1>
              <span className="brand-subtitle">Enterprise Audit Platform</span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="nav-actions">
            <button className="nav-btn" onClick={() => navigate('/register/admin')}>
              Admin
            </button>
            <button className="nav-btn" onClick={() => navigate('/register/customer')}>
              Customer
            </button>
            <button className="nav-btn" onClick={() => navigate('/register/auditor')}>
              Auditor
            </button>
            <button className="nav-btn nav-btn-primary" onClick={() => navigate('/register/vendor')}>
              Auditee / Vendor
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <button className="mobile-nav-btn" onClick={() => navigate('/register/admin')}>
              Admin
            </button>
            <button className="mobile-nav-btn" onClick={() => navigate('/register/customer')}>
              Customer
            </button>
            <button className="mobile-nav-btn" onClick={() => navigate('/register/auditor')}>
              Auditor
            </button>
            <button className="mobile-nav-btn mobile-nav-btn-primary" onClick={() => navigate('/register/vendor')}>
              Auditee / Vendor
            </button>
          </div>
        )}
      </nav>

      {/* Main Hero Section */}
      <main className="hero-section">
        <div className="hero-content">
          <div className="hero-text-column">
            <h2 className="hero-heading">
              Smarter Compliance. <br />
              <span className="hero-heading-highlight">Simplified Audits.</span>
            </h2>
            <p className="hero-description">
              A unified platform to manage compliance assessments, streamline audits, track progress, and make informed decisions.
            </p>
            <div className="hero-cta">
              <button className="btn-get-started" onClick={() => navigate('/register/auditor')}>
                Start Assessment <ArrowRight className="btn-icon-right" />
              </button>
            </div>
            
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-value">100%</span>
                <span className="stat-label">Secure</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">Role-Based</span>
                <span className="stat-label">Access</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">Real-time</span>
                <span className="stat-label">Reporting</span>
              </div>
            </div>
          </div>
          
          <div className="hero-visual-column">
            <div className="dashboard-preview">
              <div className="dashboard-header">
                <div className="dash-dot red"></div>
                <div className="dash-dot yellow"></div>
                <div className="dash-dot green"></div>
              </div>
              <div className="dashboard-body">
                <div className="dash-sidebar">
                  <div className="dash-menu-item active"></div>
                  <div className="dash-menu-item"></div>
                  <div className="dash-menu-item"></div>
                </div>
                <div className="dash-main">
                  <div className="dash-top-cards">
                    <div className="dash-card">
                      <Activity className="dash-icon blue" />
                      <div className="dash-line short"></div>
                      <div className="dash-line long"></div>
                    </div>
                    <div className="dash-card">
                      <BarChart3 className="dash-icon cyan" />
                      <div className="dash-line short"></div>
                      <div className="dash-line long"></div>
                    </div>
                    <div className="dash-card">
                      <Users className="dash-icon navy" />
                      <div className="dash-line short"></div>
                      <div className="dash-line long"></div>
                    </div>
                  </div>
                  <div className="dash-chart-area">
                    <div className="dash-chart-bar" style={{height: '60%'}}></div>
                    <div className="dash-chart-bar" style={{height: '80%'}}></div>
                    <div className="dash-chart-bar" style={{height: '40%'}}></div>
                    <div className="dash-chart-bar" style={{height: '100%'}}></div>
                    <div className="dash-chart-bar" style={{height: '75%'}}></div>
                    <div className="dash-chart-bar" style={{height: '50%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
