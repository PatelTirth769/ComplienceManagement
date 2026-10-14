import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User as UserIcon, 
  LogOut, 
  ChevronDown, 
  ShieldCheck, 
  Mail, 
  CheckCircle2 
} from 'lucide-react';

interface UserHeaderMenuProps {
  portalTitle: string;
}

export const UserHeaderMenu: React.FC<UserHeaderMenuProps> = ({ portalTitle }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safePortalTitle = portalTitle || 'Compliance Platform';
  const formattedRole = safePortalTitle.toLowerCase().includes('portal') 
    ? safePortalTitle 
    : `${safePortalTitle} Portal`;

  const initials = (user?.name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="profile-menu-container" ref={menuRef}>
      {/* Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="profile-menu-trigger"
        type="button"
        title="Open Profile Menu"
      >
        <div className="profile-avatar-circle">
          {initials || <UserIcon style={{ width: '1.1rem', height: '1.1rem' }} />}
        </div>
        <div className="profile-details">
          <span className="profile-name">
            {user?.name || 'User'}
          </span>
          <span className="profile-role-tag">
            {formattedRole}
          </span>
        </div>
        <ChevronDown 
          className={`profile-chevron ${isOpen ? 'open' : ''}`} 
        />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="profile-dropdown-card">
          {/* Header Box */}
          <div className="dropdown-header-box">
            <div className="dropdown-user-row">
              <div className="dropdown-big-avatar">
                {initials}
              </div>
              <div className="dropdown-user-text">
                <h4 className="dropdown-user-title">{user?.name || 'User Account'}</h4>
                <p className="dropdown-user-email flex items-center gap-1">
                  <Mail style={{ width: '0.75rem', height: '0.75rem', color: '#94A3B8' }} />
                  <span>{user?.email || `${user?.name || 'user'}@compliance.com`}</span>
                </p>
              </div>
            </div>
            <div className="dropdown-badge-pill">
              <ShieldCheck style={{ width: '0.875rem', height: '0.875rem' }} />
              <span>{formattedRole}</span>
            </div>
          </div>

          {/* Session Status */}
          <div className="dropdown-status-row">
            <span>Session Status</span>
            <span className="status-active-tag">
              <CheckCircle2 style={{ width: '0.75rem', height: '0.75rem' }} /> Active
            </span>
          </div>

          {/* Actions */}
          <div className="dropdown-actions-box">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="dropdown-logout-btn"
              type="button"
            >
              <LogOut style={{ width: '1rem', height: '1rem' }} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
