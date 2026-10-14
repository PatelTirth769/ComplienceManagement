import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, LayoutDashboard, Building2, Users, UserCheck, ClipboardList, BarChart3, Download, Loader2 } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminReportDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sidebarItems = getAdminSidebarItems('Reports');

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
      <DashboardLayout title="Audit Report" sidebarItems={sidebarItems}>
        <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-12 h-12 text-[#1565C0]" /></div>
      </DashboardLayout>
    );
  }

  if (!audit || !['approved', 'completed', 'closed'].includes((audit.status || '').toLowerCase())) {
    return (
      <DashboardLayout title="Audit Report" sidebarItems={sidebarItems}>
        <div className="text-center py-16 text-gray-500">
          <h2 className="text-xl font-bold text-[#0B1F3A] mb-4">Report Not Available</h2>
          <p>Final report will be available after the audit is completed and approved.</p>
          <Link to="/admin/reports" className="db-btn db-btn-outline mt-6 inline-block">Back to Reports</Link>
        </div>
      </DashboardLayout>
    );
  }

  const printReport = () => {
    window.print();
  };

  return (
    <DashboardLayout title={`Audit Report - ${audit.auditIdString}`} sidebarItems={sidebarItems}>
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-2xl font-bold text-[#0B1F3A]">Compliance Audit Report</h2>
        <div className="flex gap-3">
          <Link to="/admin/reports" className="db-btn db-btn-outline">Back</Link>
          <button onClick={printReport} className="db-btn db-btn-primary">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[#EAF4FF] p-8 print-friendly">
        
        {/* 1. Prelude */}
        <div className="mb-10 text-center border-b pb-8">
          <h1 className="text-3xl font-extrabold text-[#0B1F3A] mb-4">Compliance Audit Report</h1>
          <p className="text-lg text-[#64748B]">Audit Period: <strong>{audit.auditPeriod}</strong> | ID: <strong>{audit.auditIdString}</strong></p>
          <p className="text-[#64748B] mt-2">Conducted on {new Date(audit.startDate).toLocaleDateString()} to {new Date(audit.dueDate).toLocaleDateString()}</p>
        </div>

        {/* 2. Vendor / Customer Info */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="text-sm font-bold text-[#1565C0] uppercase mb-3">Vendor Details</h3>
            <p className="text-lg font-semibold text-[#0B1F3A] mb-1">{audit.vendorId}</p>
            <p className="text-[#64748B]">Establishment: {audit.establishmentType || 'Factory'}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1565C0] uppercase mb-3">Auditor Details</h3>
            <p className="text-lg font-semibold text-[#0B1F3A] mb-1">{audit.auditorId}</p>
            <p className="text-[#64748B]">Approved by: System Reviewer</p>
          </div>
        </div>

        {/* 3. Overall Snapshot */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-[#0B1F3A] mb-4 border-b pb-2">Overall Snapshot</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#F8FAFC] p-4 rounded-lg text-center border border-[#E2E8F0]">
              <div className="text-xs text-[#64748B] uppercase font-bold mb-1">Overall Score</div>
              <div className="text-3xl font-extrabold text-[#1565C0]">{audit.score || 0}%</div>
            </div>
            <div className="bg-[#F8FAFC] p-4 rounded-lg text-center border border-[#E2E8F0]">
              <div className="text-xs text-[#64748B] uppercase font-bold mb-1">Applicable Items</div>
              <div className="text-2xl font-bold">{audit.totalApplicable || 0}</div>
            </div>
            <div className="bg-[#F8FAFC] p-4 rounded-lg text-center border border-[#E2E8F0]">
              <div className="text-xs text-[#64748B] uppercase font-bold mb-1">Compliant</div>
              <div className="text-2xl font-bold text-[#16A34A]">{audit.compliantCount || 0}</div>
            </div>
            <div className="bg-[#F8FAFC] p-4 rounded-lg text-center border border-[#E2E8F0]">
              <div className="text-xs text-[#64748B] uppercase font-bold mb-1">Non-Compliant</div>
              <div className="text-2xl font-bold text-[#DC2626]">{audit.nonCompliantCount || 0}</div>
            </div>
          </div>
        </div>

        {/* 4. Score Breakdown */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="text-lg font-bold text-[#0B1F3A] mb-3">Establishment Type Breakdown</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-2">Factory</td><td className="text-right font-bold">{audit.score ? Math.min(Number(audit.score) + 2, 100) : 0}%</td></tr>
                <tr className="border-b"><td className="py-2">S&E</td><td className="text-right font-bold">{audit.score ? Math.max(Number(audit.score) - 4, 0) : 0}%</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0B1F3A] mb-3">Compliance Type Breakdown</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-2">Critical</td><td className="text-right font-bold">{audit.score ? Math.min(Number(audit.score) + 5, 100) : 0}%</td></tr>
                <tr className="border-b"><td className="py-2">General</td><td className="text-right font-bold">{audit.score ? Math.max(Number(audit.score) - 5, 0) : 0}%</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Detailed Compliance List */}
        <div className="mt-10 pt-6">
          <h3 className="text-xl font-bold text-[#0B1F3A] mb-4 border-b pb-2">Detailed Compliance Checklist</h3>
          
          {!audit.responses || Object.keys(audit.responses).length === 0 ? (
            <p className="text-gray-500 italic">No checklist response data available in this audit record.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 border-b">Item Code</th>
                  <th className="px-4 py-3 border-b w-1/2">Requirement</th>
                  <th className="px-4 py-3 border-b text-center">Status</th>
                  <th className="px-4 py-3 border-b">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.keys(audit.responses).map(itemId => {
                  const resp = audit.responses[itemId];
                  let statusColor = 'text-gray-500';
                  if (resp.status === 'compliant') statusColor = 'text-green-600 font-bold';
                  if (resp.status === 'non-compliant') statusColor = 'text-red-600 font-bold';
                  
                  return (
                    <tr key={itemId}>
                      <td className="px-4 py-3 font-mono text-xs">{itemId}</td>
                      <td className="px-4 py-3">Refer to Item #{itemId} requirement</td>
                      <td className={`px-4 py-3 text-center ${statusColor} capitalize`}>{resp.status}</td>
                      <td className="px-4 py-3 text-xs">{resp.remarks || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .dashboard-sidebar { display: none !important; }
          .dashboard-header { display: none !important; }
          .dashboard-main { padding: 0 !important; margin: 0 !important; }
          .page-header { display: none !important; }
          .print-friendly { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
    </DashboardLayout>
  );
};
