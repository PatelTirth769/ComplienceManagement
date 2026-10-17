import React from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Search, 
  User as UserIcon, 
  LogOut,
  Menu,
  X,
  ArrowLeft
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserHeaderMenu } from './UserHeaderMenu';
import './DashboardLayout.css';

interface SidebarItem {
  name: string;
  icon: React.ElementType;
  active?: boolean;
  path?: string;
}

interface DashboardLayoutProps {
  title: string;
  sidebarItems: SidebarItem[];
  children: ReactNode;
  backUrl?: string;
  backLabel?: string;
  hideBackButton?: boolean;
}

export const getLogicalParent = (pathname: string, portalTitle?: string): string => {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // 1. Admin Portal
  if (cleanPath === '/admin/audits/create' || cleanPath.startsWith('/admin/audits/')) {
    return '/admin/audits';
  }
  if (cleanPath.startsWith('/admin/reports/')) {
    return '/admin/reports';
  }
  if (cleanPath.startsWith('/admin/') && cleanPath !== '/admin') {
    return '/admin';
  }
  if (cleanPath === '/admin') {
    return '';
  }

  // 2. Customer Portal
  if (cleanPath.startsWith('/customer/vendors/')) {
    return '/customer/vendors';
  }
  if (cleanPath.startsWith('/customer/audits/')) {
    return '/customer/audits';
  }
  if (cleanPath.startsWith('/customer/') && cleanPath !== '/customer') {
    return '/customer';
  }
  if (cleanPath === '/customer') {
    return '';
  }

  // 3. Vendor Portal
  if (cleanPath.startsWith('/vendor/audits/')) {
    return '/vendor/audits';
  }
  if (cleanPath.startsWith('/vendor/') && cleanPath !== '/vendor') {
    return '/vendor';
  }
  if (cleanPath === '/vendor') {
    return '';
  }

  // 4. Auditor Portal
  if (cleanPath.startsWith('/auditor')) {
    return '';
  }

  // 5. Fallback based on portal title
  const t = (portalTitle || '').toLowerCase();
  if (t.includes('admin') && cleanPath !== '/admin') return '/admin';
  if (t.includes('customer') && cleanPath !== '/customer') return '/customer';
  if (t.includes('vendor') && cleanPath !== '/vendor') return '/vendor';

  return '';
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  title, 
  sidebarItems, 
  children,
  backUrl,
  backLabel,
  hideBackButton = false
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const cleanPath = location.pathname.replace(/\/+$/, '') || '/';
  const isDashboardRoot = 
    cleanPath === '/admin' || 
    cleanPath === '/customer' || 
    cleanPath === '/vendor' || 
    cleanPath === '/auditor' || 
    cleanPath === '/';

  const targetParent = backUrl || getLogicalParent(location.pathname, title);

  const shouldShowBackButton = !hideBackButton && !isDashboardRoot && Boolean(targetParent);

  const handleBack = () => {
    if (targetParent) {
      navigate(targetParent);
    }
  };

  return (
    <div className="dashboard-wrapper">
      {/* Top Navigation */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="brand-logo">
            <div className="brand-icon-shield">
              <ShieldCheck className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="brand-name hidden sm:block">Compliance Platform</span>
              {title?.toLowerCase().includes('admin') && (
                <span className="admin-console-badge hidden md:inline-flex">Admin Console</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="header-center hidden md:flex">
          <div className="search-bar">
            <Search className="search-icon" />
            <input type="text" placeholder="Search audits, vendors, metrics..." />
            <kbd className="search-kbd-badge hidden lg:inline-flex">Ctrl K</kbd>
          </div>
        </div>

        <div className="header-right">
          <UserHeaderMenu portalTitle={title || 'Compliance Platform'} />
        </div>
      </header>

      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-mobile-header">
            <span className="font-bold">Navigation</span>
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="sidebar-section-header">Main Menu</div>

          <nav className="sidebar-nav">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  to={item.path || '#'}
                  className={`sidebar-link ${item.active ? 'active' : ''}`}
                  onClick={(e) => {
                    if (!item.path) e.preventDefault();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Icon className="sidebar-icon" />
                  <span className="sidebar-link-text">{item.name}</span>
                  {item.active && <span className="sidebar-active-indicator" />}
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-spacer" />

          {/* Sidebar Status Widget */}
          <div className="sidebar-status-widget">
            <div className="status-ping-row">
              <span className="status-ping-dot"></span>
              <span className="status-ping-label">Operational</span>
            </div>
            <div className="status-meta-text">SOC-2 Type II Certified</div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="page-content">
            {shouldShowBackButton && (
              <div className="dashboard-back-wrapper">
                <button
                  type="button"
                  onClick={handleBack}
                  className="dashboard-content-back-btn"
                  title="Go back to previous page"
                >
                  <ArrowLeft className="back-icon" />
                  <span>{backLabel || 'Back'}</span>
                </button>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
    </div>
  );
};
