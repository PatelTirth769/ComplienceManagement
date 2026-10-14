import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  FileSearch,
  CheckSquare,
  ShieldAlert,
  Building2,
  MapPin
} from 'lucide-react';
import './RoleAuth.css';

export const RoleAuth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useParams<{ role: string }>();
  const { login, register } = useAuth();
  
  const isLogin = location.pathname.startsWith('/login');
  const validRoles = ['admin', 'customer', 'auditor', 'vendor'];
  
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
  
  // Form States
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  
  // Status States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!role || !validRoles.includes(role.toLowerCase())) {
      navigate('/');
    }
  }, [role, navigate]);

  // Reset all fields when switching between login/register or changing roles
  useEffect(() => {
    setError('');
    setSuccess('');
    setFullName('');
    setCompanyName('');
    setContactPerson('');
    setAddress('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
  }, [isLogin, role]);

  const toggleMode = () => {
    navigate(isLogin ? `/register/${role}` : `/login/${role}`);
    setError('');
    setSuccess('');
    // Reset fields
    setFullName('');
    setCompanyName('');
    setContactPerson('');
    setAddress('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
  };

  const validateRegistration = () => {
    if (!email || !password || !confirmPassword || !phone) {
      setError('Please fill out all required fields.');
      return false;
    }
    
    if (role === 'admin' || role === 'auditor') {
      if (!fullName) {
        setError('Full Name is required.'); return false;
      }
    }
    
    if (role === 'customer') {
      if (!fullName || !companyName) {
        setError('Full Name and Company Name are required.'); return false;
      }
    }
    
    if (role === 'vendor') {
      if (!companyName || !contactPerson || !address) {
        setError('Company Name, Contact Person, and Address are required.'); return false;
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
    setIsLoading(true);

    try {
      if (isLogin) {
        if (!validateLogin()) {
          setIsLoading(false);
          return;
        }
        
        await login(email, password, displayRole as any);
        
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          navigate(`/${role}`); // e.g. /admin, /vendor, /auditor, /customer
        }, 1000);
        
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
          navigate(`/${role}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT SIDE: Visual Branding */}
      <div className="auth-branding">
        <div className="branding-content">
          <div className="branding-logo-wrapper cursor-pointer" onClick={() => navigate('/')}>
            <ShieldCheck className="branding-logo" />
            <h1 className="branding-title">Compliance Calculator</h1>
          </div>
          
          <h2 className="branding-headline">Smarter Compliance. Simplified Audits.</h2>
          <p className="branding-description">
            A comprehensive enterprise platform to manage compliance assessments, 
            streamline audit workflows, and track real-time progress.
          </p>
          
          <div className="auth-illustration">
            <div className="illust-card illust-card-1">
              <ShieldAlert className="illust-icon navy" />
              <div className="illust-lines">
                <div className="illust-line w-3/4"></div>
                <div className="illust-line w-1/2"></div>
              </div>
            </div>
            <div className="illust-card illust-card-2">
              <CheckSquare className="illust-icon cyan" />
              <div className="illust-lines">
                <div className="illust-line w-full"></div>
                <div className="illust-line w-5/6"></div>
              </div>
            </div>
            <div className="illust-card illust-card-3">
              <FileSearch className="illust-icon blue" />
              <div className="illust-lines">
                <div className="illust-line w-2/3"></div>
                <div className="illust-line w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="auth-bg-blob auth-bg-blob-1"></div>
        <div className="auth-bg-blob auth-bg-blob-2"></div>
      </div>

      {/* RIGHT SIDE: Form Area */}
      <div className="auth-form-wrapper">
        <div className="auth-form-card">
          <div className="form-header">
            <div className="portal-badge mb-4 inline-block bg-[#EAF4FF] text-[#1565C0] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-[#bfdbfe]">
              {displayRole} Portal
            </div>
            <h2 className="form-title">
              {isLogin ? `${displayRole} Login` : `Create your ${displayRole} Account`}
            </h2>
            <p className="form-subtitle">
              {isLogin 
                ? 'Sign in to access your dashboard.' 
                : 'Enter your details below to get started.'}
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <AlertCircle className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-alert auth-alert-success">
              <CheckCircle2 className="alert-icon" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" autoComplete={isLogin ? "on" : "off"}>
            {!isLogin && (
              <>
                {(role === 'admin' || role === 'auditor' || role === 'customer') && (
                  <div className="input-group">
                    <label>Full Name <span className="required">*</span></label>
                    <div className="input-wrapper">
                      <UserIcon className="input-icon" />
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}
                
                {(role === 'customer' || role === 'vendor') && (
                  <div className="input-group">
                    <label>{role === 'vendor' ? 'Company / Vendor Name' : 'Company Name'} <span className="required">*</span></label>
                    <div className="input-wrapper">
                      <Building2 className="input-icon" />
                      <input 
                        type="text" 
                        placeholder="Acme Corp"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                {role === 'vendor' && (
                  <>
                    <div className="input-group">
                      <label>Contact Person <span className="required">*</span></label>
                      <div className="input-wrapper">
                        <UserIcon className="input-icon" />
                        <input 
                          type="text" 
                          placeholder="Jane Smith"
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Address <span className="required">*</span></label>
                      <div className="input-wrapper">
                        <MapPin className="input-icon" />
                        <input 
                          type="text" 
                          placeholder="123 Business St, City"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          disabled={isLoading}
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
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="input-group">
              <label>Email Address <span className="required">*</span></label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input 
                  type="email" 
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <div className="password-header">
                <label>Password <span className="required">*</span></label>
                {isLogin && (
                  <button type="button" className="forgot-password">
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="input-group">
                <label>Confirm Password <span className="required">*</span></label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="auth-submit-btn mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="submit-icon" />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer mt-6 text-center text-sm text-[#475569]">
            {isLogin ? (
              <p>
                Don't have an account?{' '}
                <button type="button" onClick={toggleMode} className="toggle-link font-bold text-[#1565C0] hover:underline">
                  Create Account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={toggleMode} className="toggle-link font-bold text-[#1565C0] hover:underline">
                  Login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
