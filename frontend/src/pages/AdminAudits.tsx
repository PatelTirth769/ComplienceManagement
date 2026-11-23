import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, Plus, Search, Loader2, Trash2, AlertTriangle, CheckCircle2, FileSpreadsheet, Filter, Eye, Calendar, Clock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { API_BASE_URL, updateAuditTimeline } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';
import { formatDate, parseFlexibleDate } from '../utils/dateUtils';
import { DateInput } from '../components/DateInput';

export const AdminAudits: React.FC = () => {
  const location = useLocation();
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [auditTypeFilter, setAuditTypeFilter] = useState<'Original' | 'Re-Audit'>('Original');

  // Delete Audit state
  const [selectedAuditToDelete, setSelectedAuditToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Timeline state
  const [selectedAuditForTimeline, setSelectedAuditForTimeline] = useState<any | null>(null);
  const [newStartDate, setNewStartDate] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isUpdatingTimeline, setIsUpdatingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  const sidebarItems = getAdminSidebarItems('Audits');

  const fetchAudits = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/audits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAudits(data.audits);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.newAudit) {
      const incoming = location.state.newAudit;
      setAudits(prev => {
        if (prev.some(a => a.id === incoming.id || a.auditIdString === incoming.auditIdString)) {
          return prev;
        }
        return [incoming, ...prev];
      });
      window.history.replaceState({}, document.title);
    }
    fetchAudits();
  }, []);

  const handleDownloadExcel = async (audit: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/audits/${audit.id}/download-excel`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToastMessage({ type: 'error', text: data.error || 'Excel download is available only after audit completion (100%).' });
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${audit.auditIdString || audit.id}_${(audit.auditPeriod || 'Report').replace(/\s+/g, '_')}_Complete-Audit.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToastMessage({ type: 'success', text: 'Excel report downloaded successfully.' });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Download Excel error:', err);
      setToastMessage({ type: 'error', text: 'Failed to download Excel file. Please try again.' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAuditToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/admin/audits/${selectedAuditToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        const deletedIds = new Set<string>(data.deletedIds || [selectedAuditToDelete.id]);
        const deletedStrings = new Set<string>(data.deletedIdStrings || [selectedAuditToDelete.auditIdString]);
        const baseAuditString = data.baseAuditIdString || (selectedAuditToDelete.auditIdString || '').replace(/-RA\d*$/, '');

        // Immediately remove all matching original and re-audits from local table state by document ID
        setAudits(prev => prev.filter(a => {
          if (deletedIds.has(a.id)) return false;
          if (a.parentAuditId && deletedIds.has(a.parentAuditId)) return false;
          if (a.originalAuditId && deletedIds.has(a.originalAuditId)) return false;
          return true;
        }));

        setSelectedAuditToDelete(null);
        setToastMessage({ type: 'success', text: data.message || 'Audit and associated records deleted successfully.' });
        fetchAudits();
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        if (data.error === 'Audit not found') {
          // If audit was already deleted from DB, clean it up from table immediately
          const targetId = selectedAuditToDelete.id;
          setAudits(prev => prev.filter(a => a.id !== targetId));
          setSelectedAuditToDelete(null);
          setToastMessage({ type: 'success', text: 'Audit record cleared.' });
          setTimeout(() => setToastMessage(null), 4000);
        } else {
          setDeleteError(data.error || 'Unable to delete the audit. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Delete audit error:', err);
      setDeleteError('Unable to delete the audit. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenTimelineModal = (audit: any) => {
    setSelectedAuditForTimeline(audit);
    setNewStartDate(audit.startDate || '');
    setNewDueDate(audit.dueDate || '');
    setTimelineError('');
  };

  const handleStartDateChange = (val: string) => {
    setNewStartDate(val);
    const sDate = parseFlexibleDate(val);
    if (sDate) {
      // Auto-suggest 2-3 days timeline (startDate + 2 days)
      const dDate = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate() + 2);
      const mStr = String(dDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dDate.getDate()).padStart(2, '0');
      setNewDueDate(`${dDate.getFullYear()}-${mStr}-${dayStr}`);
    }
  };

  const handleSaveTimeline = async () => {
    if (!selectedAuditForTimeline) return;
    if (!newStartDate || !newDueDate) {
      setTimelineError('Please enter both Scheduled Start Date and Compliance Due Date.');
      return;
    }
    const sDate = parseFlexibleDate(newStartDate);
    const dDate = parseFlexibleDate(newDueDate);
    if (!sDate || !dDate) {
      setTimelineError('Invalid date format.');
      return;
    }
    if (dDate < sDate) {
      setTimelineError('Due Date cannot be before Start Date.');
      return;
    }

    try {
      setIsUpdatingTimeline(true);
      setTimelineError('');
      const res = await updateAuditTimeline(selectedAuditForTimeline.id, newStartDate, newDueDate);
      if (res && res.success) {
        setAudits(prev => prev.map(a =>
          (a.id === selectedAuditForTimeline.id || a.auditIdString === selectedAuditForTimeline.auditIdString)
            ? { ...a, startDate: newStartDate, dueDate: newDueDate }
            : a
        ));
        setToastMessage({
          type: 'success',
          text: `Audit timeline updated to ${formatDate(newStartDate)} - ${formatDate(newDueDate)} & notification email sent to auditor successfully!`
        });
        setTimeout(() => setToastMessage(null), 5000);
        setSelectedAuditForTimeline(null);
      } else {
        setTimelineError(res?.error || 'Failed to update timeline.');
      }
    } catch (err: any) {
      console.error('Failed to update timeline:', err);
      setTimelineError(err.response?.data?.error || err.message || 'Failed to update timeline');
    } finally {
      setIsUpdatingTimeline(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'scheduled') return <span className="db-badge progress"><span className="db-badge-dot"></span> Scheduled</span>;
    if (s === 'in progress') return <span className="db-badge progress"><span className="db-badge-dot"></span> In Progress</span>;
    if (s === 'pending sign-off') return <span className="db-badge pending"><span className="db-badge-dot"></span> Pending Sign-off</span>;
    if (s === 'approved' || s === 'completed' || s === 'closed') return <span className="db-badge completed"><span className="db-badge-dot"></span> {status}</span>;
    return <span className="db-badge"><span className="db-badge-dot bg-gray-500"></span> {status || 'Unknown'}</span>;
  };

  const auditTypeAudits = audits.filter(a => {
    const isRe = a.auditType === 'Re-Audit' || a.auditType === 'Re Audit';
    if (auditTypeFilter === 'Original') return !isRe;
    const st = (a.status || '').toLowerCase();
    return isRe && !(st === 'in progress' && (a.score === null || a.score === undefined));
  });

  const filtered = auditTypeAudits.filter(a => {
    const matchesSearch = (a.auditIdString || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.auditPeriod || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (a.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout title="Admin Portal - Audits" sidebarItems={sidebarItems}>
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="admin-header-title">Audit Management</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> Active Governance
            </span>
          </div>
          <p className="admin-header-subtitle">Monitor compliance schedules, field auditor submissions, and sign-offs.</p>
        </div>
        <Link to="/admin/audits/create" className="db-btn db-btn-primary">
          <Plus className="w-4 h-4 mr-1" /> Create Audit
        </Link>
      </div>

      {toastMessage && (
        <div className={`mb-4 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-sm ${toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. Main Table Card */}
      <div className="db-card">
        <div className="table-toolbar">
          {/* Audit Type Filter Dropdown at 1st Position */}
          <div className="flex items-center gap-2">
            <div className="filter-dropdown-wrapper">
              <Filter className="filter-dropdown-icon" />
              <select
                className="filter-dropdown-select font-bold"
                value={auditTypeFilter}
                onChange={e => setAuditTypeFilter(e.target.value as 'Original' | 'Re-Audit')}
              >
                <option value="Original">Audit Type: Original</option>
                <option value="Re-Audit">Audit Type: Re Audit</option>
              </select>
            </div>
          </div>

          <div className="search-input-wrapper">
            <Search className="search-input-icon" />
            <input
              type="text"
              placeholder="Search by Audit ID, Period..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-3">
            <div className="filter-dropdown-wrapper">
              <Filter className="filter-dropdown-icon" />
              <select
                className="filter-dropdown-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses ({auditTypeAudits.length})</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Sign-off">Pending Sign-off</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <span className="text-xs text-slate-500 font-semibold hidden md:inline">
              Showing {filtered.length} of {auditTypeAudits.length}
            </span>
          </div>
        </div>

        <div className="db-table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th style={{ width: '105px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                    <span style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>Audit Type</span>
                    <select
                      value={auditTypeFilter}
                      onChange={e => setAuditTypeFilter(e.target.value as 'Original' | 'Re-Audit')}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '5px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        outline: 'none'
                      }}
                      title="Toggle between Original and Re Audit"
                    >
                      <option value="Original">Original</option>
                      <option value="Re-Audit">Re Audit</option>
                    </select>
                  </div>
                </th>
                <th>Audit ID</th>
                <th>Period</th>
                <th>Audit Timeline</th>
                <th>Status</th>
                <th>Score</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12"><Loader2 className="animate-spin w-6 h-6 mx-auto text-[#0B63E5]" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-500">No {auditTypeFilter === 'Original' ? 'original audits' : 're-audits'} found matching current filter</p>
                  </td>
                </tr>
              ) : (
                filtered.map(a => {
                  const is100Percent = a.completionPercentage === 100 || ['closed', 'completed', 'approved'].includes((a.status || '').toLowerCase());
                  const isRe = a.auditType === 'Re-Audit' || a.auditType === 'Re Audit';
                  return (
                    <tr key={a.id}>
                      <td>
                        {isRe ? (
                          <span
                            className="db-badge"
                            style={{
                              backgroundColor: '#F3E8FF',
                              color: '#7E22CE',
                              border: '1px solid #D8B4FE',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.725rem'
                            }}
                          >
                            <span className="db-badge-dot" style={{ backgroundColor: '#9333EA' }}></span>
                            Re Audit
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                            <span
                              className="db-badge"
                              style={{
                                backgroundColor: '#ECFDF5',
                                color: '#047857',
                                border: '1px solid #A7F3D0',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '0.725rem'
                              }}
                            >
                              <span className="db-badge-dot" style={{ backgroundColor: '#10B981' }}></span>
                              Original
                            </span>
                            {a.isReadOnly && (
                              <span
                                className="db-badge"
                                style={{
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  border: '1px solid #FDE68A',
                                  fontSize: '0.65rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }}
                                title="This original audit has been re-audited and is now read-only"
                              >
                                Read-Only
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="audit-id-badge" style={{ whiteSpace: 'nowrap' }}>{a.auditIdString}</span>
                      </td>
                      <td className="font-semibold text-slate-800">{a.auditPeriod}</td>
                      <td className="text-xs font-medium text-slate-600">
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ whiteSpace: 'nowrap' }}>{formatDate(a.startDate)} - {formatDate(a.dueDate)}</span>
                          {(() => {
                            const stat = (a.status || '').toLowerCase();
                            const isClosedOrReadOnly = stat === 'closed' || stat === 'completed' || stat === 'approved' || a.isReadOnly === true;
                            return (
                              <button
                                type="button"
                                disabled={isClosedOrReadOnly}
                                onClick={isClosedOrReadOnly ? undefined : () => handleOpenTimelineModal(a)}
                                title={isClosedOrReadOnly ? (a.isReadOnly ? "Audit is Read-Only — timeline cannot be edited" : "Audit is closed — timeline cannot be edited") : "Reschedule Audit Timeline & Notify Auditor"}
                                style={{
                                  background: isClosedOrReadOnly ? '#F1F5F9' : '#EFF6FF',
                                  border: `1px solid ${isClosedOrReadOnly ? '#E2E8F0' : '#BFDBFE'}`,
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  cursor: isClosedOrReadOnly ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  color: isClosedOrReadOnly ? '#94A3B8' : '#1D4ED8',
                                  fontSize: '0.675rem',
                                  fontWeight: 700,
                                  lineHeight: 1,
                                  opacity: isClosedOrReadOnly ? 0.6 : 1
                                }}
                              >
                                <Calendar style={{ width: '11px', height: '11px', color: isClosedOrReadOnly ? '#94A3B8' : '#2563EB' }} />
                                <span>Edit</span>
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                      <td>{getStatusBadge(a.status)}</td>
                      <td>
                        {a.score !== null ? (
                          <span className={`score-badge-pill ${a.score >= 80 ? 'high' : a.score >= 50 ? 'medium' : 'low'}`} style={{ whiteSpace: 'nowrap' }}>
                            {typeof a.score === 'number' ? Math.round(a.score) : a.score}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic font-medium">N/A</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="table-action-cluster">
                          <Link to={`/admin/audits/${a.id}`} className="btn-action-view" title="View Audit Details">
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Link>

                          {is100Percent ? (
                            <button
                              onClick={() => handleDownloadExcel(a)}
                              className="btn-action-excel"
                              title="Download Complete Excel Workbook"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Excel</span>
                            </button>
                          ) : (
                            <button
                              disabled
                              className="btn-action-excel"
                              title="Excel download available after audit completion"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Excel</span>
                            </button>
                          )}

                          <button
                            onClick={() => { setSelectedAuditToDelete(a); setDeleteError(''); }}
                            className="btn-action-delete"
                            title="Delete Audit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reschedule Audit Timeline Modal */}
      {selectedAuditForTimeline && (
        <div className="modal-overlay" onClick={() => !isUpdatingTimeline && setSelectedAuditForTimeline(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-badge" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                <Clock className="w-6 h-6" />
              </div>
              <div className="modal-header-text">
                <h3 className="modal-title">Reschedule Audit Timeline</h3>
                <span className="modal-subtitle">Update submission dates and automatically notify auditor</span>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-info-box" style={{ marginBottom: '1.25rem' }}>
                <div className="modal-info-row">
                  <span className="modal-info-label">Audit ID:</span>
                  <span className="modal-info-value mono">{selectedAuditForTimeline.auditIdString || selectedAuditForTimeline.id}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Period / Target:</span>
                  <span className="modal-info-value">{selectedAuditForTimeline.auditPeriod || 'N/A'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Vendor:</span>
                  <span className="modal-info-value">{selectedAuditForTimeline.vendorName || selectedAuditForTimeline.vendorId || 'N/A'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Auditor:</span>
                  <span className="modal-info-value">{selectedAuditForTimeline.auditorName || selectedAuditForTimeline.auditor || 'Auditor'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Scheduled Start Date <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <DateInput
                    value={newStartDate}
                    placeholder="dd-mm-yyyy"
                    onChange={e => handleStartDateChange(e.target.value)}
                    disabled={isUpdatingTimeline}
                    style={{
                      width: '100%',
                      padding: '0.5rem 2rem 0.5rem 0.65rem',
                      fontSize: '0.8125rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      backgroundColor: isUpdatingTimeline ? '#F8FAFC' : '#FFFFFF',
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Compliance Due Date <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <DateInput
                    value={newDueDate}
                    placeholder="dd-mm-yyyy"
                    onChange={e => setNewDueDate(e.target.value)}
                    disabled={isUpdatingTimeline}
                    style={{
                      width: '100%',
                      padding: '0.5rem 2rem 0.5rem 0.65rem',
                      fontSize: '0.8125rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      backgroundColor: isUpdatingTimeline ? '#F8FAFC' : '#FFFFFF',
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '6px',
                padding: '0.625rem 0.85rem',
                fontSize: '0.75rem',
                color: '#166534',
                lineHeight: 1.45
              }}>
                📧 <strong>Notification:</strong> When you save, an automated email with the revised timeline will immediately be dispatched to the assigned auditor ({selectedAuditForTimeline.auditorEmail || selectedAuditForTimeline.auditor || 'Auditor'}) and vendor.
              </div>

              {timelineError && (
                <div className="modal-error-text mt-3">
                  {timelineError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                disabled={isUpdatingTimeline}
                onClick={() => setSelectedAuditForTimeline(null)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingTimeline}
                onClick={handleSaveTimeline}
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: isUpdatingTimeline ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                }}
              >
                {isUpdatingTimeline ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rescheduling & Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>Save & Notify Auditor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedAuditToDelete && (
        <div className="modal-overlay" onClick={() => !isDeleting && setSelectedAuditToDelete(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-badge">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="modal-header-text">
                <h3 className="modal-title">Delete Audit?</h3>
                <span className="modal-subtitle">Permanently delete this compliance audit</span>
              </div>
            </div>

            <div className="modal-body">
              <p className="text-sm text-slate-600 mb-3 font-medium">
                Are you sure you want to delete this audit?
              </p>

              <div className="modal-info-box">
                <div className="modal-info-row">
                  <span className="modal-info-label">Audit ID:</span>
                  <span className="modal-info-value mono">{selectedAuditToDelete.auditIdString || selectedAuditToDelete.id}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Audit Period:</span>
                  <span className="modal-info-value">{selectedAuditToDelete.auditPeriod || 'N/A'}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Vendor:</span>
                  <span className="modal-info-value">{selectedAuditToDelete.vendorName || selectedAuditToDelete.vendorId || 'N/A'}</span>
                </div>
              </div>

              <div className="modal-warning-text">
                ⚠️ This action will permanently remove this audit and its associated audit data. This action cannot be undone.
              </div>

              {deleteError && (
                <div className="modal-error-text mt-3">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                disabled={isDeleting}
                onClick={() => { setSelectedAuditToDelete(null); setDeleteError(''); }}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="btn-delete-confirm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting Audit...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

