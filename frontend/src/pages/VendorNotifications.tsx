import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare, CheckCircle2, Info
} from 'lucide-react';
import { getVendorNotifications } from '../services/api';

export const VendorNotifications: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor' },
    { name: 'My Profile', icon: User, path: '/vendor/profile' },
    { name: 'My Audits', icon: FileCheck, path: '/vendor/audits' },
    { name: 'Documents', icon: FolderOpen, path: '/vendor/documents' },
    { name: 'Findings & Actions', icon: AlertTriangle, path: '/vendor/findings' },
    { name: 'Audit Timeline', icon: Clock, path: '/vendor/timeline' },
    { name: 'Reports', icon: BarChart3, path: '/vendor/reports' },
    { name: 'Notifications', icon: Bell, active: true, path: '/vendor/notifications' },
    { name: 'Contact Auditor', icon: MessageSquare, path: '/vendor/contact' }
  ];

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await getVendorNotifications();
        if (response.success) {
          setNotifications(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const getNotificationIcon = (title: string = '') => {
    const t = title.toLowerCase();
    if (t.includes('responded') || t.includes('finding')) {
      return { icon: AlertTriangle, bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' };
    }
    if (t.includes('sign-off') || t.includes('closed') || t.includes('completed')) {
      return { icon: CheckCircle2, bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
    }
    return { icon: Bell, bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px' }}>
          <div style={{
            width: '42px', height: '42px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Header Banner */}
      <div style={{ marginBottom: '1.75rem', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell style={{ width: '20px', height: '20px', color: '#1565C0' }} />
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>Notifications</h1>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, paddingLeft: '2.875rem' }}>
          Stay updated on your audit lifecycle, auditor comments, and required compliance actions.
        </p>
      </div>

      {/* Notifications Card */}
      <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden', animation: 'fadeIn 0.4s ease 0.1s both'
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>All System Notifications</h3>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1565C0', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.2rem 0.625rem', borderRadius: '999px' }}>
            {notifications.length} Unread Updates
          </span>
        </div>

        {notifications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((notif) => {
              const iconInfo = getNotificationIcon(notif.title);
              const IconComp = iconInfo.icon;

              return (
                <div 
                  key={notif.id} 
                  style={{
                    padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9',
                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    transition: 'background 0.15s ease', cursor: 'default'
                  }}
                >
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: iconInfo.bg, border: `1px solid ${iconInfo.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <IconComp style={{ width: '18px', height: '18px', color: iconInfo.color }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0B1F3A', margin: 0 }}>
                        {notif.title}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, background: '#F8FAFC', padding: '0.15rem 0.5rem', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                        {new Date(notif.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ color: '#475569', fontSize: '0.8375rem', margin: 0, lineHeight: 1.45 }}>
                      {notif.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Bell style={{ width: '40px', height: '40px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>No Notifications</h3>
            <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0, maxWidth: '340px', marginInline: 'auto' }}>
              You are all caught up! System notifications and audit status alerts will appear here.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

