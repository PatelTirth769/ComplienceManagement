import React from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Bell, 
  Search, 
  User as UserIcon, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, sidebarItems, children }) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="dashboard-wrapper">
      {/* Top Navigation */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="brand-logo">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <span className="brand-name hidden sm:block">Compliance Platform</span>
          </div>
        </div>
        
        <div className="header-center hidden md:flex">
          <div className="search-bar">
            <Search className="search-icon" />
            <input type="text" placeholder="Search audits, vendors..." />
          </div>
        </div>

        <div className="header-right">
          <button 
            className="icon-btn" 
            title="Notifications"
            onClick={() => {
              const t = (title || '').toLowerCase();
              if (t.includes('customer')) {
                window.location.href = '/customer/notifications';
              } else if (t.includes('vendor')) {
                window.location.href = '/vendor/notifications';
              }
            }}
          >
            <Bell className="h-5 w-5" />
            <span className="notification-dot"></span>
          </button>
          <UserHeaderMenu portalTitle={title || 'Compliance Platform'} />
        </div>
      </header>

      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-mobile-header">
            <span className="font-bold">Menu</span>
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
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
                  }}
                >
                  <Icon className="sidebar-icon" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="page-content">
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
