import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, Plus, Search, Loader2, Trash2, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0B1F3A]">Audits</h2>
        <Link to="/admin/audits/create" className="db-btn db-btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Create Audit
        </Link>
      </div>

      {toastMessage && (
        <div className={`mb-4 p-3.5 rounded-lg text-xs font-bold flex items-center gap-2 border ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="db-card">
        <div className="db-card-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search Audit ID, Period..." 
                className="pl-9 pr-4 py-2 border rounded-md w-full text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="border rounded-md px-3 py-2 text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Sign-off">Pending Sign-off</option>
              <option value="Approved">Approved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
        <div className="db-table-wrapper">
          <table className="db-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Period</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="animate-spin w-6 h-6 mx-auto text-[#1565C0]" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No audits available</td></tr>
              ) : (
                filtered.map(a => {
                  const is100Percent = a.completionPercentage === 100 || ['closed', 'completed', 'approved'].includes((a.status || '').toLowerCase());
                  return (
                    <tr key={a.id}>
                      <td className="font-semibold text-[#0B1F3A]">{a.auditIdString}</td>
                      <td>{a.auditPeriod}</td>
                      <td className="text-sm">
                        {new Date(a.startDate).toLocaleDateString()} - {new Date(a.dueDate).toLocaleDateString()}
                      </td>
                      <td>{getStatusBadge(a.status)}</td>
                      <td className="font-bold">{a.score ? `${a.score}%` : <span className="text-gray-400 font-normal">N/A</span>}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Link to={`/admin/audits/${a.id}`} className="db-btn db-btn-outline text-xs py-1 px-2.5">View</Link>
                          
                          {is100Percent ? (
                            <button 
                              onClick={() => handleDownloadExcel(a)}
                              className="db-btn text-xs py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Download Complete Excel Workbook"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Excel</span>
                            </button>
                          ) : (
                            <button 
                              disabled
                              className="db-btn text-xs py-1 px-2.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-md font-medium cursor-not-allowed opacity-60 flex items-center gap-1"
                              title="Excel download available after audit completion."
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
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

