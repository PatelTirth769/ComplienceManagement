import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Loader2, CheckCircle2, Circle, FileText } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminAuditDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sidebarItems = getAdminSidebarItems('Audits');

  const handleSignOff = async () => {
    if (!window.confirm('Are you sure you want to sign off and close this audit?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      let res = await fetch(`${API_BASE_URL}/admin/audits/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Closed', notes: 'Approved and signed off by Reviewer' })
      });

      if (res.status === 404) {
        res = await fetch(`${API_BASE_URL}/admin/audits/${id}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'Closed', notes: 'Approved and signed off by Reviewer' })
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Audit successfully signed off and marked as Closed!');
        window.location.reload();
      } else {
        const rawErr = data.error || data.message || 'Failed to sign off audit.';
        const errText = typeof rawErr === 'object' ? (rawErr.message || JSON.stringify(rawErr)) : String(rawErr);
        alert(`Failed to sign off audit: ${errText}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error performing sign off: ${err?.message || err}`);
    }
  };

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE_URL}/admin/audits/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setAudit(data.audit);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAudit();
  }, [id]);

  if (isLoading) {
    return (
      <DashboardLayout title="Audit Details" sidebarItems={sidebarItems}>
        <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-12 h-12 text-[#1565C0]" /></div>
      </DashboardLayout>
    );
  }

  if (!audit) {
    return (
      <DashboardLayout title="Audit Details" sidebarItems={sidebarItems}>
        <div className="text-center py-16 text-gray-500">Audit not found</div>
      </DashboardLayout>
    );
  }

  const s = (audit.status || '').toLowerCase();
  const isStarted = s !== 'scheduled';
  const isCompleted = s === 'completed' || s === 'closed' || s === 'approved';
  
  return (
    <DashboardLayout title={`Audit Details - ${audit.auditIdString}`} sidebarItems={sidebarItems}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0B1F3A]">{audit.auditIdString}</h2>
        <div className="flex gap-3">
          <Link to="/admin/audits" className="db-btn db-btn-outline">Back to Audits</Link>
          {isCompleted && (
            <button className="db-btn db-btn-primary"><FileText className="w-4 h-4 mr-2" /> View Report</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Audit Information */}
          <div className="db-card">
            <div className="db-card-header">
              <h3 className="db-card-title">Audit Information</h3>
            </div>
            <div className="db-card-body grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#64748B] font-semibold mb-1">Customer ID</p>
                <p className="font-medium">{audit.customerId}</p>
              </div>
              <div>
                <p className="text-[#64748B] font-semibold mb-1">Vendor ID</p>
                <p className="font-medium">{audit.vendorId}</p>
              </div>
              <div>
                <p className="text-[#64748B] font-semibold mb-1">Auditor ID</p>
                <p className="font-medium">{audit.auditorId}</p>
              </div>
              <div>
                <p className="text-[#64748B] font-semibold mb-1">Audit Period</p>
                <p className="font-medium">{audit.auditPeriod}</p>
              </div>
              <div>
                <p className="text-[#64748B] font-semibold mb-1">Start Date</p>
                <p className="font-medium">{new Date(audit.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[#64748B] font-semibold mb-1">Due Date</p>
                <p className="font-medium">{new Date(audit.dueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[#64748B] font-semibold mb-1">Current Status</p>
                <span className="bg-[#EAF4FF] text-[#1565C0] px-3 py-1 rounded-full text-xs font-bold border border-[#bfdbfe]">
                  {audit.status}
                </span>
              </div>
            </div>
          </div>

          {/* Compliance Summary */}
          <div className="db-card">
            <div className="db-card-header">
              <h3 className="db-card-title">Compliance Summary</h3>
            </div>
            <div className="db-card-body">
              {!isStarted ? (
                <div className="text-center py-8 text-[#64748B]">Score not available yet</div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <h3 className="text-[#64748B] font-semibold uppercase text-sm mb-2">Overall Score</h3>
                    <div className="text-5xl font-extrabold text-[#1565C0]">{audit.score || 0}%</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 pt-6 border-t border-[#E2E8F0] text-center">
                    <div>
                      <div className="text-xs text-[#64748B] uppercase font-bold">Applicable Items</div>
                      <div className="text-xl font-bold">{audit.totalApplicable || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#64748B] uppercase font-bold">Compliant</div>
                      <div className="text-xl font-bold text-[#16A34A]">{audit.compliantCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#64748B] uppercase font-bold">Non-Compliant</div>
                      <div className="text-xl font-bold text-[#DC2626]">{audit.nonCompliantCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#64748B] uppercase font-bold">N/A</div>
                      <div className="text-xl font-bold">{audit.naCount || 0}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Findings Summary */}
          <div className="db-card">
            <div className="db-card-header flex justify-between items-center">
              <h3 className="db-card-title">Findings Summary</h3>
              {audit.findingsCount > 0 && <button className="text-sm text-[#1565C0] font-semibold">View Findings</button>}
            </div>
            <div className="db-card-body">
              {!audit.findingsCount ? (
                <p className="text-[#64748B] text-center py-6">No findings available.</p>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-[#64748B] uppercase font-bold">Open</div>
                    <div className="text-xl font-bold text-[#DC2626]">{audit.findingsOpen || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#64748B] uppercase font-bold">Resolved</div>
                    <div className="text-xl font-bold text-[#16A34A]">{audit.findingsResolved || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#64748B] uppercase font-bold">Pending Review</div>
                    <div className="text-xl font-bold text-[#D97706]">{audit.findingsPending || 0}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* Audit Timeline */}
          <div className="db-card">
            <div className="db-card-header">
              <h3 className="db-card-title">Audit Timeline</h3>
            </div>
            <div className="db-card-body">
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-icon-wrapper">
                    <div className="timeline-icon done"><CheckCircle2 className="h-4 w-4" /></div>
                    <div className="timeline-line done"></div>
                  </div>
                  <div className="timeline-content">
                    <h4 className="timeline-title">Audit Scheduled</h4>
                    <p className="timeline-desc">{new Date(audit.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-icon-wrapper">
                    <div className={`timeline-icon ${isStarted ? 'done' : 'upcoming'}`}>
                      {isStarted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-[#94A3B8]" />}
                    </div>
                    <div className={`timeline-line ${isStarted ? 'done' : ''}`}></div>
                  </div>
                  <div className="timeline-content">
                    <h4 className={`timeline-title ${!isStarted && 'text-[#94A3B8]'}`}>Audit In Progress</h4>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-icon-wrapper">
                    <div className={`timeline-icon ${s === 'pending sign-off' || isCompleted ? 'done' : 'upcoming'}`}>
                      {s === 'pending sign-off' || isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-[#94A3B8]" />}
                    </div>
                    <div className={`timeline-line ${isCompleted ? 'done' : ''}`}></div>
                  </div>
                  <div className="timeline-content">
                    <h4 className={`timeline-title ${!(s === 'pending sign-off' || isCompleted) && 'text-[#94A3B8]'}`}>Auditor Submitted</h4>
                  </div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-icon-wrapper">
                    <div className={`timeline-icon ${isCompleted ? 'done' : 'upcoming'}`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-[#94A3B8]" />}
                    </div>
                  </div>
                  <div className="timeline-content">
                    <h4 className={`timeline-title ${!isCompleted && 'text-[#94A3B8]'}`}>Audit Closed</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sign-off Status */}
          <div className="db-card">
            <div className="db-card-header">
              <h3 className="db-card-title">Sign-off Status</h3>
            </div>
            <div className="db-card-body">
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#0B1F3A] mb-1">Auditor Submission</p>
                {s === 'pending sign-off' || isCompleted ? (
                  <span className="text-[#16A34A] text-sm flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Submitted</span>
                ) : (
                  <span className="text-[#64748B] text-sm flex items-center"><Circle className="w-4 h-4 mr-1" /> Pending</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0B1F3A] mb-1">Reviewer Sign-off</p>
                {isCompleted ? (
                  <span className="text-[#16A34A] text-sm flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Approved & Closed</span>
                ) : (
                  <span className="text-[#D97706] text-sm flex items-center"><Circle className="w-4 h-4 mr-1" /> Pending Sign-off</span>
                )}
              </div>

              {!isCompleted && (
                <button
                  onClick={handleSignOff}
                  className="db-btn db-btn-primary w-full mt-4 justify-center py-2.5 text-sm font-semibold shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  Sign Off & Approve Audit
                </button>
              )}
            </div>
          </div>

          {!isCompleted && (
            <div className="db-card bg-gray-50 border-dashed">
              <div className="db-card-body text-center">
                <p className="text-sm text-[#64748B]">Final report will be available after the audit is completed.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
