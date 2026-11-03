import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, Building2, FileCheck, Clock, 
  BarChart3, Bell, Search, Filter, Eye, RefreshCw,
  AlertCircle, ChevronRight, User, MapPin, Mail, Phone, FileText, Presentation, FileBarChart
} from 'lucide-react';
import { getCustomerVendors } from '../services/api';

export const CustomerVendors: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/customer' },
    { name: 'My Vendors', icon: Building2, active: true, path: '/customer/vendors' },
    { name: 'Audits', icon: FileCheck, path: '/customer/audits' },
    { name: 'Audit Timeline', icon: Clock, path: '/customer/timeline' },
    { name: 'Compliance Scores', icon: BarChart3, path: '/customer/scores' },
    { name: 'Reports', icon: FileText, path: '/customer/reports' },
    { name: 'Notifications', icon: Bell, path: '/customer/notifications' },
    { name: 'Overall PPT', icon: Presentation, path: '/customer/overall-ppt' },
    { name: 'Overall Report', icon: FileBarChart, path: '/customer/overall-report' }
  ];

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCustomerVendors();
      if (res.success && res.data) {
        setVendors(res.data);
      } else {
        setError(res.error || 'Failed to fetch vendors data.');
      }
    } catch (err: any) {
      console.error('Error fetching customer vendors:', err);
      setError('Network error: Unable to load assigned vendors.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const getStatusBadgeStyle = (statusStr?: string) => {
    if (!statusStr) return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'No Audit' };
    const s = statusStr.toLowerCase();
    if (['closed', 'completed', 'approved'].includes(s)) {
      return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: 'Closed' };
    }
    if (s === 'pending sign-off' || s === 'under review') {
      return { bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE', label: 'Pending Sign-off' };
    }
    if (s === 'in progress') {
      return { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', label: 'In Progress' };
    }
    return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: statusStr || 'Scheduled' };
  };

  const getScoreBadgeStyle = (score: number | null) => {
    if (score == null) return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: 'N/A' };
    const roundScore = Math.round(score);
    if (roundScore >= 80) return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', label: `${roundScore}%` };
    if (roundScore >= 50) return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: `${roundScore}%` };
    return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: `${roundScore}%` };
  };

  const filteredVendors = vendors.filter(v => {
    const q = searchQuery.toLowerCase().trim();
    const vendorName = (v.companyName || v.name || '').toLowerCase();
    const vendorIdStr = (v.id || v.vendorId || '').toLowerCase();
    const auditIdStr = (v.currentAudit?.auditIdString || '').toLowerCase();
    
    const matchesSearch = !q || vendorName.includes(q) || vendorIdStr.includes(q) || auditIdStr.includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    const currentStatus = (v.currentAudit?.status || '').toLowerCase();
    if (statusFilter === 'CLOSED') return ['closed', 'completed', 'approved'].includes(currentStatus);
    if (statusFilter === 'PENDING') return ['pending sign-off', 'under review'].includes(currentStatus);
    if (statusFilter === 'IN_PROGRESS') return currentStatus === 'in progress';
    if (statusFilter === 'SCHEDULED') return currentStatus === 'scheduled';
    return true;
  });

  return (
    <DashboardLayout title="Customer Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .vendor-table-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          overflow: hidden;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
              My Vendors
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              View and monitor vendors assigned to your organization.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1565C0', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.35rem 0.75rem', borderRadius: '999px' }}>
              {filteredVendors.length} Vendors Total
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="vendor-table-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', animation: 'fadeIn 0.3s ease 0.1s both' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '240px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search vendor name, ID, or audit ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '8px',
                border: '1px solid #CBD5E1', fontSize: '0.8375rem', outline: 'none', background: 'white'
              }}
            />
          </div>

          {/* Audit Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter style={{ width: '15px', height: '15px', color: '#64748B' }} />
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#475569' }}>Audit Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                fontSize: '0.8125rem', fontWeight: 600, color: '#0B1F3A', background: 'white', outline: 'none'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING">Pending Sign-off</option>
              <option value="CLOSED">Closed / Approved</option>
            </select>
          </div>

          {/* Clear Button */}
          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
              style={{
                padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0',
                background: '#F8FAFC', color: '#64748B', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Vendor Content */}
      {isLoading ? (
        <div className="vendor-table-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading assigned vendors...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div className="vendor-table-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
          <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Unable to load vendors</h3>
          <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{error}</p>
          <button
            onClick={fetchVendors}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626',
              color: 'white', fontWeight: 700, fontSize: '0.8125rem', border: 'none', cursor: 'pointer'
            }}
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} />
            Retry
          </button>
        </div>
      ) : (
        <div className="vendor-table-card" style={{ animation: 'fadeIn 0.3s ease 0.15s both' }}>
          {filteredVendors.length > 0 ? (
            <div style={{ width: '100%', overflowX: 'hidden' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <colgroup>
                  <col style={{ width: '19%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Vendor</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Vendor ID</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Contact Person</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Current Audit</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Progress</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Compliance Score</th>
                    <th style={{ padding: '0.75rem 0.6rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => {
                    const ca = vendor.currentAudit;
                    const st = getStatusBadgeStyle(ca?.status);
                    const sc = getScoreBadgeStyle(ca?.score);
                    const pct = ca?.completionPercentage !== undefined && ca?.completionPercentage !== null
                      ? Number(ca.completionPercentage)
                      : 0;

                    return (
                      <tr key={vendor.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                        {/* Vendor Name */}
                        <td style={{ padding: '0.75rem 0.6rem', fontWeight: 700, color: '#0B1F3A', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Building2 style={{ width: '15px', height: '15px', color: '#1565C0' }} />
                            </div>
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                              <div style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={vendor.companyName || vendor.name || 'Vendor'}>
                                {vendor.companyName || vendor.name || 'Vendor'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={vendor.establishmentDetails || vendor.industry || 'Supplier / Service Provider'}>
                                {vendor.establishmentDetails || vendor.industry || 'Supplier / Service Provider'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vendor ID */}
                        <td style={{ padding: '0.75rem 0.6rem', color: '#64748B', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.775rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          #{vendor.id ? vendor.id.slice(0, 8) : 'N/A'}
                        </td>

                        {/* Contact Person */}
                        <td style={{ padding: '0.75rem 0.6rem', color: '#475569', overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.7875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }} title={vendor.contactPerson || vendor.representative || 'N/A'}>
                            {vendor.contactPerson || vendor.representative || 'N/A'}
                          </div>
                          {vendor.email && (
                            <div style={{ fontSize: '0.7rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={vendor.email}>
                              {vendor.email}
                            </div>
                          )}
                        </td>

                        {/* Current Audit */}
                        <td style={{ padding: '0.75rem 0.6rem', color: '#0B1F3A', fontWeight: 700, overflow: 'hidden' }}>
                          {ca ? (
                            <div style={{ minWidth: 0 }}>
                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>{ca.auditIdString}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ca.auditPeriod}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '0.75rem' }}>No audit</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.5rem',
                            borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                            background: st.bg, color: st.color, border: `1px solid ${st.border}`
                          }}>
                            {st.label}
                          </span>
                        </td>

                        {/* Progress */}
                        <td style={{ padding: '0.75rem 0.6rem' }}>
                          {ca ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <div style={{ flexGrow: 1, height: '5px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1565C0', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                              </div>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', minWidth: '26px' }}>{pct}%</span>
                            </div>
                          ) : (
                            <span style={{ color: '#CBD5E1' }}>—</span>
                          )}
                        </td>

                        {/* Compliance Score */}
                        <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.5rem',
                            borderRadius: '999px', fontSize: '0.725rem', fontWeight: 800,
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`
                          }}>
                            {sc.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.75rem 0.6rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => navigate(`/customer/vendors/${vendor.id}`)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.3rem 0.6rem', borderRadius: '7px',
                              background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE',
                              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Eye style={{ width: '13px', height: '13px' }} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <Building2 style={{ width: '44px', height: '44px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>
                {searchQuery || statusFilter !== 'ALL' ? 'No matching vendors found' : 'No vendors assigned to your account.'}
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>
                {searchQuery || statusFilter !== 'ALL' ? 'Try adjusting your search query or filter selection.' : 'Vendor assignments will appear here once linked by administrator.'}
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
