import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, Plus, Search, Loader2, Trash2, AlertTriangle, CheckCircle2, FileSpreadsheet, Filter, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminAudits: React.FC = () => {
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Delete Audit state
  const [selectedAuditToDelete, setSelectedAuditToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        setSelectedAuditToDelete(null);
        setToastMessage({ type: 'success', text: 'Audit deleted successfully.' });
        fetchAudits();
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setDeleteError(data.error || 'Unable to delete the audit. Please try again.');
      }
    } catch (err: any) {
      console.error('Delete audit error:', err);
      setDeleteError('Unable to delete the audit. Please try again.');
    } finally {
      setIsDeleting(false);
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

  const filtered = audits.filter(a => {
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
        <div className={`mb-4 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-sm ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. Main Table Card */}
      <div className="db-card">
        <div className="table-toolbar">
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
                <option value="All">All Statuses ({audits.length})</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Sign-off">Pending Sign-off</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <span className="text-xs text-slate-500 font-semibold hidden md:inline">
              Showing {filtered.length} of {audits.length}
            </span>
          </div>
        </div>

        <div className="db-table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
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
                <tr><td colSpan={6} className="text-center py-12"><Loader2 className="animate-spin w-6 h-6 mx-auto text-[#0B63E5]" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <FileCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-500">No audits found matching current filter</p>
                  </td>
                </tr>
              ) : (
                filtered.map(a => {
                  const is100Percent = a.completionPercentage === 100 || ['closed', 'completed', 'approved'].includes((a.status || '').toLowerCase());
                  return (
                    <tr key={a.id}>
                      <td>
                        <span className="audit-id-badge">{a.auditIdString}</span>
                      </td>
                      <td className="font-semibold text-slate-800">{a.auditPeriod}</td>
                      <td className="text-xs font-medium text-slate-600">
                        {new Date(a.startDate).toLocaleDateString()} - {new Date(a.dueDate).toLocaleDateString()}
                      </td>
                      <td>{getStatusBadge(a.status)}</td>
                      <td>
                        {a.score !== null ? (
                          <span className={`score-badge-pill ${a.score >= 80 ? 'high' : a.score >= 50 ? 'medium' : 'low'}`}>
                            {a.score}%
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

