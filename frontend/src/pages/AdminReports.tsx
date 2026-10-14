import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { FileCheck, LayoutDashboard, Building2, Users, UserCheck, ClipboardList, BarChart3, Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const sidebarItems = getAdminSidebarItems('Reports');

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      // We pull completed/closed audits for reports
      const res = await fetch(`${API_BASE_URL}/admin/audits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Filter only completed audits for reports
        const completed = data.audits.filter((a: any) => 
          ['approved', 'completed', 'closed'].includes((a.status || '').toLowerCase())
        );
        setReports(completed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = reports.filter(r => 
    (r.auditIdString || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.vendorId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Admin Portal - Reports" sidebarItems={sidebarItems}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0B1F3A]">Completed Audit Reports</h2>
      </div>

      <div className="db-card">
        <div className="db-card-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search Audit ID, Vendor..." 
              className="pl-9 pr-4 py-2 border rounded-md w-full text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="db-table-wrapper">
          <table className="db-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Vendor</th>
                <th>Customer</th>
                <th>Period</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="animate-spin w-6 h-6 mx-auto text-[#1565C0]" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No completed reports available</td></tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id}>
                    <td className="font-semibold text-[#0B1F3A]">{r.auditIdString}</td>
                    <td className="truncate max-w-[120px]" title={r.vendorId}>{r.vendorId}</td>
                    <td className="truncate max-w-[120px]" title={r.customerId}>{r.customerId}</td>
                    <td>{r.auditPeriod}</td>
                    <td className="font-bold text-[#1565C0]">{r.score}%</td>
                    <td>
                      <Link to={`/admin/reports/${r.id}`} className="db-btn db-btn-primary text-xs py-1 px-3">View Report</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};
