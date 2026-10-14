import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, Filter, Eye, CheckCheck,
  AlertCircle, Shield, FileText, CheckCircle2, AlertTriangle, ArrowRight, Presentation, FileBarChart
} from 'lucide-react';
import { 
  getCustomerNotifications, 
  markCustomerNotificationRead, 
  markAllCustomerNotificationsRead 
} from '../services/api';

export const CustomerNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalNotifications: 0, unreadCount: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/customer' },
    { name: 'My Vendors', icon: Building2, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, active: true, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, path: '/customer/overall-report' }
  ];

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
        if (res.summary) {
          setSummary(res.summary);
        }
      } else {
        setError(res.error || 'Failed to fetch notifications.');
      }
    } catch (err: any) {
      console.error('Error fetching customer notifications:', err);
      setError('Network error: Unable to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setSummary((prev: any) => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }));
      await markCustomerNotificationRead(id);
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setSummary((prev: any) => ({ ...prev, unreadCount: 0 }));
      const allIds = notifications.map(n => n.id);
      await markAllCustomerNotificationsRead(allIds);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleNotificationClick = (item: any) => {
    if (!item.read) {
      handleMarkAsRead(item.id);
    }
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  const filteredNotifications = notifications.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const title = (item.title || '').toLowerCase();
    const msg = (item.message || '').toLowerCase();
    const vendor = (item.vendorName || '').toLowerCase();
    const auditId = (item.auditIdString || '').toLowerCase();

    const matchesSearch = !q || title.includes(q) || msg.includes(q) || vendor.includes(q) || auditId.includes(q);
    if (!matchesSearch) return false;

    if (filterType === 'UNREAD' && item.read) return false;
    if (filterType === 'SUCCESS' && item.type !== 'success') return false;
    if (filterType === 'ACTION' && item.type !== 'action') return false;

    return true;
  });

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .notif-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .notif-item {
          padding: 1rem 1.25rem;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          transition: all 0.15s ease;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
        }
        .notif-item.unread {
          background: #F0F9FF;
          border-color: #BFDBFE;
        }
        .notif-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
            Notifications
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            Stay updated on your assigned vendors and statutory audit activity.
          </p>
        </div>

        {summary.unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '8px', background: '#EFF6FF',
              color: '#1565C0', border: '1px solid #BFDBFE', fontSize: '0.8rem',
              fontWeight: 700, cursor: 'pointer'
            }}
          >
            <CheckCheck style={{ width: '16px', height: '16px' }} />
            Mark all as read ({summary.unreadCount})
          </button>
        )}
      </div>

      {/* Summary Strips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease 0.05s both' }}>
        <div className="notif-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell style={{ width: '24px', height: '24px', color: '#1565C0' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Notifications</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', marginTop: '2px' }}>{summary.totalNotifications || notifications.length}</div>
          </div>
        </div>

        <div className="notif-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: summary.unreadCount > 0 ? '#EEF2FF' : '#F1F5F9', border: summary.unreadCount > 0 ? '1px solid #C7D2FE' : '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell style={{ width: '24px', height: '24px', color: summary.unreadCount > 0 ? '#4338CA' : '#64748B' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: summary.unreadCount > 0 ? '#4338CA' : '#64748B', textTransform: 'uppercase' }}>Unread</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: summary.unreadCount > 0 ? '#4338CA' : '#64748B', marginTop: '2px' }}>{summary.unreadCount}</div>
          </div>
        </div>

        <div className="notif-card" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock style={{ width: '24px', height: '24px', color: '#047857' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Recent Activity</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>{notifications.slice(0, 5).length}</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="notif-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading notifications...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div className="notif-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Unable to load notifications</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{error}</p>
          <button onClick={fetchNotifications} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      ) : (
        <div className="notif-card" style={{ padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.1s both' }}>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #F1F5F9' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Activity Notifications ({filteredNotifications.length})
            </h2>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search vendor or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '0.775rem', outline: 'none', background: 'white'
                  }}
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '0.775rem', fontWeight: 600, color: '#0B1F3A', background: 'white'
                }}
              >
                <option value="ALL">All Types</option>
                <option value="UNREAD">Unread Only</option>
                <option value="SUCCESS">Closed / Report</option>
                <option value="ACTION">Action Required</option>
              </select>
            </div>
          </div>

          {/* List */}
          {filteredNotifications.length > 0 ? (
            <div>
              {filteredNotifications.map((item) => {
                const isUnread = !item.read;

                return (
                  <div
                    key={item.id}
                    className={`notif-item ${isUnread ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                      background: item.type === 'success' ? '#ECFDF5' : (item.type === 'action' ? '#EFF6FF' : '#F1F5F9'),
                      border: item.type === 'success' ? '1px solid #A7F3D0' : (item.type === 'action' ? '1px solid #BFDBFE' : '1px solid #CBD5E1'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px'
                    }}>
                      {item.type === 'success' ? (
                        <CheckCircle2 style={{ width: '20px', height: '20px', color: '#047857' }} />
                      ) : item.type === 'action' ? (
                        <FileCheck style={{ width: '20px', height: '20px', color: '#1565C0' }} />
                      ) : (
                        <Bell style={{ width: '20px', height: '20px', color: '#64748B' }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0B1F3A' }}>
                            {item.title}
                          </span>
                          {isUnread && (
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1565C0' }} />
                          )}
                        </div>

                        <span style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 500 }}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                        {item.message}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            {item.vendorName}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.725rem', fontWeight: 700, color: '#1565C0', background: '#EFF6FF', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            {item.auditIdString}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {isUnread && (
                            <button
                              onClick={(e) => handleMarkAsRead(item.id, e)}
                              style={{
                                background: 'none', border: 'none', color: '#64748B', fontSize: '0.725rem',
                                fontWeight: 700, cursor: 'pointer', textDecoration: 'underline'
                              }}
                            >
                              Mark Read
                            </button>
                          )}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#1565C0', fontSize: '0.75rem', fontWeight: 700 }}>
                            View <ArrowRight style={{ width: '12px', height: '12px' }} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <Bell style={{ width: '44px', height: '44px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>You're all caught up!</h3>
              <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>No notifications found for the current filter.</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
