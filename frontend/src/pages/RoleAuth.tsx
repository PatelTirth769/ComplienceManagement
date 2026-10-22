import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Shield,
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  LogIn,
  UserPlus,
  Info
} from 'lucide-react';
import './RoleAuth.css';

export const RoleAuth: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useParams<{ role: string }>();
  const { login, register } = useAuth();
  
  const normalizedRole = (role || '').toLowerCase();
  const validRoles = ['admin', 'customer', 'auditor', 'vendor', 'auditee'];
  
  // Canonical role for redirects and backend (auditee maps to vendor)
  const canonicalRole = normalizedRole === 'auditee' ? 'vendor' : normalizedRole;
  const displayRole = canonicalRole === 'vendor' ? 'Vendor' : canonicalRole.charAt(0).toUpperCase() + canonicalRole.slice(1);
  const portalName = canonicalRole === 'vendor' ? 'Vendor Portal' : `${displayRole} Portal`;
  
  // Always default to 'login' unless explicitly specified via query param ?tab=register
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(() => {
    return searchParams.get('tab') === 'register' ? 'register' : 'login';
  });

  // Form States - guaranteed empty on load
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Status States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const clearFields = () => {
    setFullName('');
    setCompanyName('');
    setContactPerson('');
    setAddress('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
  };

  useEffect(() => {
    if (!role || !validRoles.includes(normalizedRole)) {
      navigate('/');
    }
  }, [role, normalizedRole, navigate]);

  // Clear fields and alerts whenever role or tab changes
  useEffect(() => {
    setError('');
    setSuccess('');
    setInfoMessage('');
    clearFields();
    
    // Extra safety pass to purge browser autofill attempts on mount
    const timer = setTimeout(() => {
      clearFields();
    }, 60);
    return () => clearTimeout(timer);
  }, [role, activeTab]);

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setInfoMessage('');
    clearFields();
    
    // Ensure viewport scrolls to top of the card so title and tabs are visible
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleForgotPassword = () => {
    setError('');
    setSuccess('');
    setInfoMessage('To reset your password, please contact your system administrator or check your registered email for recovery instructions.');
  };

  const validateRegistration = () => {
    if (!email || !password || !confirmPassword || !phone) {
      setError('Please fill out all required fields.');
      return false;
    }
    
    if (canonicalRole === 'admin' || canonicalRole === 'auditor') {
      if (!fullName) {
        setError('Full Name is required.'); 
        return false;
      }
    }
    
    if (canonicalRole === 'customer') {
      if (!fullName || !companyName) {
        setError('Full Name and Company Name are required.'); 
        return false;
      }
    }
    
    if (canonicalRole === 'vendor') {
      if (!companyName || !contactPerson || !address) {
        setError('Company Name, Contact Person, and Address are required.'); 
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid phone number (min 10 digits).');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const validateLogin = () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInfoMessage('');
    setIsLoading(true);

    try {
      if (activeTab === 'login') {
        if (!validateLogin()) {
          setIsLoading(false);
          return;
        }
        
        await login(email, password, displayRole as any);
        
        setSuccess('Login successful! Redirecting to dashboard...');
        setTimeout(() => {
          navigate(`/${canonicalRole}`); // e.g. /admin, /vendor, /auditor, /customer
        }, 800);
        
      } else {
        if (!validateRegistration()) {
          setIsLoading(false);
          return;
        }
        
        await register({
          fullName,
          companyName,
          contactPerson,
          address,
          email,
          phone,
          password,
          role: displayRole as any
        });
        
        setSuccess('Account created successfully! Redirecting...');
        setTimeout(() => {
          navigate(`/${canonicalRole}`);
        }, 1200);
      }
    } catch (err: any) {
      if (activeTab === 'login') {
        const errorMsg = (err.response?.data?.error || err.message || '').toLowerCase();
        if (
          err.response?.status === 401 || 
          err.response?.status === 403 || 
          errorMsg.includes('registered as') ||
          errorMsg.includes('invalid')
        ) {
          setError('Invalid email or password.');
          return;
        }
      }
      setError(err.response?.data?.error || err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT SIDE: Visual Branding Panel (Split Screen) */}
      <div className="auth-branding">
        <div className="branding-content">
          <div className="branding-logo-wrapper" onClick={() => navigate('/')} role="button" tabIndex={0}>
            <ShieldCheck className="branding-logo" />
            <h1 className="branding-title">Compliance Calculator</h1>
          </div>
          
          <div className="branding-hero-block">
            <h2 className="branding-headline">
              Smarter Compliance.<br />
              Simplified Audits.
            </h2>
            <p className="branding-description">
              A comprehensive enterprise platform to manage compliance assessments, 
              streamline audit workflows, and track real-time progress.
            </p>
          </div>
          
          {/* Security & Benefits Information Card */}
          <div className="branding-footer-card">
            <div className="security-badge-icon">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="security-badge-text">
              <div className="security-badge-title">Secure. Reliable. Compliant.</div>
              <div className="security-badge-desc">Your data is protected with enterprise-grade security.</div>
            </div>
          </div>

          {/* Carousel / Status Indicator Bars */}
          <div className="branding-indicators">
            <span className="indicator-pill active"></span>
            <span className="indicator-pill"></span>
            <span className="indicator-pill"></span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Card */}
      <div className="auth-form-wrapper">
        <div className="auth-card-container">
          <button 
            type="button" 
            onClick={() => navigate('/')} 
            className="auth-back-btn"
            title="Back to Home"
          >
            <ArrowLeft className="back-icon" />
            <span>Back to Home</span>
          </button>

          <div className="auth-form-card">
          {/* Header */}
          <div className="form-header">
            <div className="portal-badge-label">
              {portalName}
            </div>
            <h2 className="form-title">
              {activeTab === 'login' ? 'Welcome Back' : `Create your ${displayRole} Account`}
            </h2>
            <p className="form-subtitle">
              {activeTab === 'login' 
                ? 'Sign in to access your dashboard.' 
                : 'Enter your details below to get started.'}
            </p>
          </div>

          {/* Tab Switcher: [ Login ] [ Register ] */}
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => switchTab('register')}
            >
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </button>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="auth-alert auth-alert-error" role="alert">
              <AlertCircle className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-alert auth-alert-success" role="status">
              <CheckCircle2 className="alert-icon" />
              <span>{success}</span>
            </div>
          )}

          {infoMessage && (
            <div className="auth-alert auth-alert-info" role="status">
              <Info className="alert-icon" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Authentication Form with browser autofill prevention */}
          <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
            {/* Decoy fields to intercept aggressive browser credential managers */}
            <input 
              type="text" 
              name="fake_prevent_autofill_user" 
              style={{ display: 'none' }} 
              tabIndex={-1} 
              aria-hidden="true" 
              autoComplete="off" 
            />
            <input 
              type="password" 
              name="fake_prevent_autofill_pwd" 
              style={{ display: 'none' }} 
              tabIndex={-1} 
              aria-hidden="true" 
              autoComplete="new-password" 
            />

            {activeTab === 'register' && (
              <>
                {(canonicalRole === 'admin' || canonicalRole === 'auditor' || canonicalRole === 'customer') && (
                  <div className="input-group">
                    <label>Full Name <span className="required">*</span></label>
                    <div className="input-wrapper">
                      <UserIcon className="input-icon" />
                      <input 
                        type="text" 
                        name="auth_fullname_input"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={isLoading}
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                )}
                
                {(canonicalRole === 'customer' || canonicalRole === 'vendor') && (
                  <div className="input-group">
                    <label>{canonicalRole === 'vendor' ? 'Company / Vendor Name' : 'Company Name'} <span className="required">*</span></label>
                    <div className="input-wrapper">
                      <Building2 className="input-icon" />
                      <input 
                        type="text" 
                        name="auth_company_input"
                        placeholder="Acme Corp"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={isLoading}
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                )}

                {canonicalRole === 'vendor' && (
                  <>
                    <div className="input-group">
                      <label>Contact Person <span className="required">*</span></label>
                      <div className="input-wrapper">
                        <UserIcon className="input-icon" />
                        <input 
                          type="text" 
                          name="auth_contact_input"
                          placeholder="Jane Smith"
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          disabled={isLoading}
                          autoComplete="off"
                          required
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Address <span className="required">*</span></label>
                      <div className="input-wrapper">
                        <MapPin className="input-icon" />
                        <input 
                          type="text" 
                          name="auth_address_input"
                          placeholder="123 Business St, City"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          disabled={isLoading}
                          autoComplete="off"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="input-group">
                  <label>Phone Number <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <Phone className="input-icon" />
                    <input 
                      type="tel" 
                      name="auth_phone_input"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email field (both Login and Register) */}
            <div className="input-group">
              <label>Email Address <span className="required">*</span></label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input 
                  type="email" 
                  name={`auth_email_${activeTab}`}
                  id={`auth-email-${activeTab}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="off"
                  readOnly
                  onFocus={(e) => { e.currentTarget.readOnly = false; }}
                  required
                />
              </div>
            </div>

            {/* Password field (both Login and Register) */}
            <div className="input-group">
              <label>Password <span className="required">*</span></label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  name={`auth_password_${activeTab}`}
                  id={`auth-password-${activeTab}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  readOnly
                  onFocus={(e) => { e.currentTarget.readOnly = false; }}
                  required
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {activeTab === 'login' && (
                <div className="forgot-password-row">
                  <button 
                    type="button" 
                    className="forgot-password-link"
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {/* Confirm Password field (Register only) */}
            {activeTab === 'register' && (
              <div className="input-group">
                <label>Confirm Password <span className="required">*</span></label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    name="auth_confirm_password"
                    id="auth-confirm-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => { e.currentTarget.readOnly = false; }}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Action Submit Button */}
            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <span>{activeTab === 'login' ? 'Login to Dashboard' : 'Create Account'}</span>
                  <ArrowRight className="submit-icon" />
                </>
              )}
            </button>
          </form>

          {/* Footer Toggle Text */}
          <div className="auth-footer">
            {activeTab === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => switchTab('register')} 
                  className="toggle-link"
                >
                  Register
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => switchTab('login')} 
                  className="toggle-link"
                >
                  Login
                </button>
              </p>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
