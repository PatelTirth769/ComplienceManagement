import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  BarChart3, 
  Activity, 
  Users, 
  ArrowRight, 
  Menu, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Lock, 
  Building2, 
  UserCheck, 
  Layers, 
  Sparkles, 
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import './Home.css';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const portals = [
    {
      role: 'Enterprise Admin',
      title: 'Governance & Admin Portal',
      description: 'Centralized control to onboard customers, assign auditors, provision vendors, and oversee organization-wide compliance benchmarks.',
      badge: 'Full Governance',
      icon: <Building2 className="portal-icon text-indigo-400" />,
      path: '/login/admin',
      btnText: 'Access Admin Console',
      highlight: false
    },
    {
      role: 'Enterprise Customer',
      title: 'Customer Client Portal',
      description: 'Real-time visibility into supplier compliance scores, audit timelines, risk heatmaps, and downloadable executive PPT presentations.',
      badge: 'Executive View',
      icon: <TrendingUp className="portal-icon text-emerald-400" />,
      path: '/login/customer',
      btnText: 'Client Sign In',
      highlight: false
    },
    {
      role: 'Statutory Auditor',
      title: 'Auditor Field Suite',
      description: 'Comprehensive digital checklist engine with weighted scoring formulas, evidence capture, finding categorization, and instant draft reports.',
      badge: 'Audit Engine',
      icon: <UserCheck className="portal-icon text-cyan-400" />,
      path: '/login/auditor',
      btnText: 'Launch Auditor Suite',
      highlight: true
    },
    {
      role: 'Auditee / Vendor',
      title: 'Vendor Document Vault',
      description: 'Secure multi-category repository for statutory filings, CAPA rectification responses, real-time audit finding trackers, and certificate management.',
      badge: 'Vendor Compliance',
      icon: <FileCheck className="portal-icon text-blue-400" />,
      path: '/login/vendor',
      btnText: 'Vendor Portal Sign In',
      highlight: false
    }
  ];

  const statutoryActs = [
    { name: 'CLRA 1970', desc: 'Contract Labour (Regulation & Abolition) Act' },
    { name: 'EPF & MP 1952', desc: 'Employees Provident Funds & Misc Provisions' },
    { name: 'ESI Act 1948', desc: 'Employees State Insurance Corporation' },
    { name: 'Factories Act 1948', desc: 'Occupational Safety, Health & Working Conditions' },
    { name: 'Min. Wages 1948', desc: 'Statutory Minimum Wages & Wage Registers' },
    { name: 'Payment of Bonus', desc: 'Bonus Act & Annual Register Form C' },
    { name: 'Gratuity Act 1972', desc: 'Payment of Gratuity Rules & Notice Form L' },
    { name: 'POSH Act 2013', desc: 'Prevention of Sexual Harassment at Workplace' }
  ];

  const capabilities = [
    {
      icon: <Layers className="cap-icon" />,
      title: 'Automated Weighted Scoring',
      desc: 'Instant statutory calculation algorithms that automatically adjust for non-applicable criteria and enforce rigorous risk tiers.'
    },
    {
      icon: <Activity className="cap-icon" />,
      title: 'Real-Time CAPA Tracking',
      desc: 'Seamless collaborative deficiency rectification workflow between auditors and vendors with complete photo and document proof trails.'
    },
    {
      icon: <FileText className="cap-icon" />,
      title: 'Instant Executive PPT & Reports',
      desc: 'Generate boardroom-ready PowerPoint slide decks and multi-page comprehensive statutory audit reports in seconds.'
    },
    {
      icon: <Lock className="cap-icon" />,
      title: 'Role-Based Zero Trust Security',
      desc: 'Strict multi-tier data segregation ensuring clients, vendors, and auditors only access authorized records.'
    }
  ];

  return (
    <div className="home-container">
      {/* Navigation Bar */}
      <nav className="home-nav">
        <div className="nav-content">
          <div className="nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon-wrapper">
              <ShieldCheck className="brand-icon" />
            </div>
            <div className="brand-text">
              <div className="brand-title-row">
                <h1 className="brand-title">ComplianceOS</h1>
                <span className="brand-version-badge">v2.4 PRO</span>
              </div>
              <span className="brand-subtitle">Enterprise Audit & Risk Governance</span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="nav-actions">
            <button className="nav-btn" onClick={() => navigate('/login/admin')}>
              <span className="nav-role-dot dot-admin"></span>
              Admin
            </button>
            <button className="nav-btn" onClick={() => navigate('/login/customer')}>
              <span className="nav-role-dot dot-customer"></span>
              Customer
            </button>
            <button className="nav-btn" onClick={() => navigate('/login/auditor')}>
              <span className="nav-role-dot dot-auditor"></span>
              Auditor
            </button>
            <button className="nav-btn nav-btn-primary" onClick={() => navigate('/login/vendor')}>
              <span className="nav-role-dot dot-vendor"></span>
              Auditee / Vendor
              <ArrowUpRight className="nav-btn-icon" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <button className="mobile-nav-btn" onClick={() => { setMobileMenuOpen(false); navigate('/login/admin'); }}>
              <Building2 size={18} /> Admin Portal
            </button>
            <button className="mobile-nav-btn" onClick={() => { setMobileMenuOpen(false); navigate('/login/customer'); }}>
              <TrendingUp size={18} /> Customer Portal
            </button>
            <button className="mobile-nav-btn" onClick={() => { setMobileMenuOpen(false); navigate('/login/auditor'); }}>
              <UserCheck size={18} /> Auditor Suite
            </button>
            <button className="mobile-nav-btn mobile-nav-btn-primary" onClick={() => { setMobileMenuOpen(false); navigate('/login/vendor'); }}>
              <FileCheck size={18} /> Auditee / Vendor Portal
            </button>
          </div>
        )}
      </nav>

      {/* Main Hero Section */}
      <section className="hero-section">
        <div className="hero-glow-sphere sphere-1"></div>
        <div className="hero-glow-sphere sphere-2"></div>
        
        <div className="hero-content">
          <div className="hero-text-column">
            <div className="hero-badge">
              <Sparkles className="hero-badge-icon" />
              <span>Next-Generation Statutory Governance Platform</span>
            </div>

            <h2 className="hero-heading">
              Smarter Compliance. <br />
              <span className="hero-heading-gradient">Flawless Audits.</span>
            </h2>

            <p className="hero-description">
              The unified enterprise architecture for statutory compliance management, field audit execution, vendor governance, and real-time deficiency CAPA resolution.
            </p>

            <div className="hero-cta-group">
              <button className="btn-get-started" onClick={() => navigate('/login/auditor')}>
                <span>Start Assessment</span>
                <ArrowRight className="btn-icon-right" />
              </button>
              <button className="btn-secondary" onClick={() => {
                const element = document.getElementById('portals-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Explore Role Portals
              </button>
            </div>
            
            <div className="hero-stats-strip">
              <div className="stat-card">
                <span className="stat-number">99.8%</span>
                <span className="stat-sub">Statutory Accuracy</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-card">
                <span className="stat-number">4-Way</span>
                <span className="stat-sub">Role Synchronized</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-card">
                <span className="stat-number">100%</span>
                <span className="stat-sub">Proof-Backed CAPA</span>
              </div>
            </div>
          </div>
          
          {/* Production Mockup Dashboard */}
          <div className="hero-visual-column">
            <div className="mockup-frame">
              {/* Window Bar */}
              <div className="mockup-header">
                <div className="mockup-controls">
                  <span className="mockup-dot dot-red"></span>
                  <span className="mockup-dot dot-yellow"></span>
                  <span className="mockup-dot dot-green"></span>
                </div>
                <div className="mockup-url-bar">
                  <Lock size={12} className="url-lock" />
                  <span>app.complianceos.enterprise/audit/live-session</span>
                </div>
                <div className="mockup-status-live">
                  <span className="live-pulse"></span>
                  <span>LIVE AUDIT</span>
                </div>
              </div>

              {/* Mockup Body */}
              <div className="mockup-body">
                {/* Metric Summary Bar */}
                <div className="mockup-top-metrics">
                  <div className="metric-pill">
                    <span className="metric-label">Assigned Audit</span>
                    <strong className="metric-val">Q3 Statutory - Tata Motors</strong>
                  </div>
                  <div className="metric-pill highlight">
                    <span className="metric-label">Compliance Score</span>
                    <div className="score-display">
                      <span className="score-num">94.8%</span>
                      <span className="score-grade">High Assurance</span>
                    </div>
                  </div>
                  <div className="metric-pill">
                    <span className="metric-label">Status</span>
                    <span className="status-badge-live">In Progress</span>
                  </div>
                </div>

                {/* Score Progress Overview */}
                <div className="mockup-progress-card">
                  <div className="progress-card-header">
                    <div className="progress-title-wrap">
                      <BarChart3 size={16} className="text-cyan-400" />
                      <span>Statutory Domain Execution Progress</span>
                    </div>
                    <span className="progress-fraction">38 / 40 Verified</span>
                  </div>
                  <div className="progress-track-bg">
                    <div className="progress-track-fill" style={{ width: '95%' }}></div>
                  </div>
                </div>

                {/* Simulated Audit Checklist Items */}
                <div className="mockup-checklist-preview">
                  <div className="checklist-preview-header">
                    <span>Field Checklist Snapshot</span>
                    <span className="checklist-sub">Real-time Auditor Feed</span>
                  </div>

                  <div className="checklist-item success">
                    <div className="check-icon-wrap">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="check-info">
                      <div className="check-title">EPF Electronic Challan & ECR Filing</div>
                      <div className="check-meta">Section 6, EPF Act 1952 • Challan verified with TRRN</div>
                    </div>
                    <div className="check-status status-compliant">Compliant (100%)</div>
                  </div>

                  <div className="checklist-item success">
                    <div className="check-icon-wrap">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="check-info">
                      <div className="check-title">Contract Labour Form XII Register of Contractors</div>
                      <div className="check-meta">Rule 74, CLRA Central Rules • Up to date with photo proof</div>
                    </div>
                    <div className="check-status status-compliant">Compliant (100%)</div>
                  </div>

                  <div className="checklist-item warning">
                    <div className="check-icon-wrap">
                      <AlertTriangle size={16} />
                    </div>
                    <div className="check-info">
                      <div className="check-title">Factory First Aid Box & Trained Personnel Cert</div>
                      <div className="check-meta">Section 45, Factories Act • Form 11 certificate expired</div>
                    </div>
                    <div className="check-status status-action">Action Required</div>
                  </div>
                </div>

                {/* Floating Notification Snippet */}
                <div className="mockup-floating-banner">
                  <Clock size={14} className="text-cyan-400" />
                  <span>Real-time calculation enabled: <strong>Weighted Auto-Formula Active</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statutory Regulatory Frameworks Strip */}
      <section className="regulations-section">
        <div className="section-container">
          <div className="regulations-label">
            <span>Covering Premier Indian Statutory Acts & Labour Codes:</span>
          </div>
          <div className="regulations-grid">
            {statutoryActs.map((act, index) => (
              <div key={index} className="regulation-chip" title={act.desc}>
                <span className="reg-name">{act.name}</span>
                <span className="reg-desc">{act.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Gateways Section */}
      <section id="portals-section" className="portals-section">
        <div className="section-container">
          <div className="section-header-center">
            <div className="section-badge">Multi-Tier Architecture</div>
            <h3 className="section-title">Integrated Role-Based Portals</h3>
            <p className="section-subtitle">
              Every stakeholder gets a dedicated interface engineered specifically for their responsibilities in the compliance lifecycle.
            </p>
          </div>

          <div className="portals-grid">
            {portals.map((portal, index) => (
              <div 
                key={index} 
                className={`portal-card ${portal.highlight ? 'portal-card-highlight' : ''}`}
                onClick={() => navigate(portal.path)}
              >
                <div className="portal-header">
                  <div className="portal-icon-wrapper">
                    {portal.icon}
                  </div>
                  <span className="portal-badge">{portal.badge}</span>
                </div>

                <div className="portal-role-tag">{portal.role}</div>
                <h4 className="portal-card-title">{portal.title}</h4>
                <p className="portal-card-desc">{portal.description}</p>

                <div className="portal-card-footer">
                  <span className="portal-btn-label">{portal.btnText}</span>
                  <div className="portal-arrow-circle">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Capabilities Grid */}
      <section className="capabilities-section">
        <div className="section-container">
          <div className="section-header-center">
            <div className="section-badge">Platform Pillars</div>
            <h3 className="section-title">Built for Enterprise Compliance Operations</h3>
            <p className="section-subtitle">
              Eliminate spreadsheet errors, scattered emails, and delayed CAPA resolutions with an end-to-end digital compliance infrastructure.
            </p>
          </div>

          <div className="capabilities-grid">
            {capabilities.map((cap, index) => (
              <div key={index} className="capability-card">
                <div className="cap-icon-box">
                  {cap.icon}
                </div>
                <h4 className="cap-title">{cap.title}</h4>
                <p className="cap-desc">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-Footer CTA Banner */}
      <section className="cta-banner-section">
        <div className="section-container">
          <div className="cta-banner-box">
            <div className="cta-banner-content">
              <h3 className="cta-banner-title">Ready to streamline your statutory compliance?</h3>
              <p className="cta-banner-text">
                Join enterprise risk officers, compliance managers, and statutory auditors running assessments with zero manual friction.
              </p>
            </div>
            <div className="cta-banner-actions">
              <button className="cta-banner-btn-primary" onClick={() => navigate('/login/auditor')}>
                Launch Assessment Now <ArrowRight size={18} />
              </button>
              <button className="cta-banner-btn-secondary" onClick={() => navigate('/login/admin')}>
                Admin Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Footer */}
      <footer className="home-footer">
        <div className="section-container footer-content">
          <div className="footer-brand-col">
            <div className="nav-brand">
              <div className="brand-icon-wrapper small">
                <ShieldCheck className="brand-icon" />
              </div>
              <div className="brand-text">
                <span className="brand-title">ComplianceOS</span>
                <span className="brand-subtitle">Enterprise Audit Platform</span>
              </div>
            </div>
            <p className="footer-tagline">
              Statutory labor compliance, weighted risk scoring, and verified vendor governance platform.
            </p>
          </div>

          <div className="footer-links-col">
            <span className="footer-heading">Access Portals</span>
            <button className="footer-link-btn" onClick={() => navigate('/login/admin')}>Admin Portal</button>
            <button className="footer-link-btn" onClick={() => navigate('/login/customer')}>Customer Portal</button>
            <button className="footer-link-btn" onClick={() => navigate('/login/auditor')}>Auditor Suite</button>
            <button className="footer-link-btn" onClick={() => navigate('/login/vendor')}>Auditee / Vendor</button>
          </div>

          <div className="footer-links-col">
            <span className="footer-heading">Compliance Domains</span>
            <span className="footer-static-link">Contract Labour (CLRA)</span>
            <span className="footer-static-link">Provident Fund (EPF & MP)</span>
            <span className="footer-static-link">State Insurance (ESIC)</span>
            <span className="footer-static-link">Factories Act & Safety</span>
          </div>

          <div className="footer-links-col">
            <span className="footer-heading">Assurance</span>
            <div className="footer-security-badge">
              <Lock size={14} className="text-emerald-400" />
              <span>TLS 1.3 Encryption</span>
            </div>
            <div className="footer-security-badge">
              <ShieldCheck size={14} className="text-cyan-400" />
              <span>Role-Isolated Vault</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="section-container footer-bottom-inner">
            <span>© {new Date().getFullYear()} ComplianceOS Enterprise. All rights reserved.</span>
            <span>Statutory Audit & Labor Governance Suite</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
