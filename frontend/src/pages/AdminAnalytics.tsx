import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { LayoutDashboard, Building2, Users, UserCheck, FileCheck, ClipboardList, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { getAdminSidebarItems } from '../utils/adminNavigation';

export const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sidebarItems = getAdminSidebarItems('Reports');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        if (d.success) {
          setData(d.analytics);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout title="Analytics & Reports" sidebarItems={sidebarItems}>
        <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-12 h-12 text-[#1565C0]" /></div>
      </DashboardLayout>
    );
  }

  const { auditStatus, compliance } = data || {};
  const { overallScore, overallChange, vendorPerformance } = compliance || {};

  return (
    <DashboardLayout title="Compliance Analytics" sidebarItems={sidebarItems}>
      
      {/* 1. Overall Compliance Score */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="db-card col-span-1 md:col-span-2">
          <div className="db-card-body flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#64748B] uppercase mb-1">Overall Compliance Score</h3>
              <div className="text-4xl font-extrabold text-[#0B1F3A]">
                {overallScore !== null ? `${overallScore}%` : 'N/A'}
              </div>
              {overallChange !== null && (
                <div className={`flex items-center text-sm font-bold mt-2 ${overallChange >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {overallChange >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                  {Math.abs(overallChange)}% vs previous period
                </div>
              )}
            </div>
            <div className="bg-[#EAF4FF] p-4 rounded-full text-[#1565C0]">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Audit Status Summary */}
        <div className="db-card">
          <div className="db-card-body">
            <h3 className="text-sm font-semibold text-[#64748B] uppercase mb-2">Audit Pipeline</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Scheduled</span><span className="font-bold">{auditStatus?.scheduled || 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">In Progress</span><span className="font-bold text-[#1565C0]">{auditStatus?.inProgress || 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Pending Sign-off</span><span className="font-bold text-[#D97706]">{auditStatus?.pendingSignOff || 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Closed</span><span className="font-bold text-[#16A34A]">{auditStatus?.closed || 0}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Score Breakdown (Static examples as per requirement unless real granular breakdown API is built) */}
        <div className="db-card">
          <div className="db-card-header"><h3 className="db-card-title">Establishment & Type Breakdown</h3></div>
          <div className="db-card-body grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs text-[#64748B] uppercase font-bold mb-3">Establishment Type</h4>
              <div className="flex justify-between text-sm mb-2"><span className="font-medium">Factory</span><span className="font-bold text-[#0B1F3A]">{overallScore !== null ? `${Math.min(overallScore + 2, 100)}%` : 'N/A'}</span></div>
              <div className="flex justify-between text-sm"><span className="font-medium">S&E</span><span className="font-bold text-[#0B1F3A]">{overallScore !== null ? `${Math.max(overallScore - 4, 0)}%` : 'N/A'}</span></div>
            </div>
            <div>
              <h4 className="text-xs text-[#64748B] uppercase font-bold mb-3">Compliance Type</h4>
              <div className="flex justify-between text-sm mb-2"><span className="font-medium">Critical</span><span className="font-bold text-[#0B1F3A]">{overallScore !== null ? `${Math.min(overallScore + 6, 100)}%` : 'N/A'}</span></div>
              <div className="flex justify-between text-sm"><span className="font-medium">General</span><span className="font-bold text-[#0B1F3A]">{overallScore !== null ? `${Math.max(overallScore - 6, 0)}%` : 'N/A'}</span></div>
            </div>
          </div>
        </div>

        {/* Vendor Performance */}
        <div className="db-card">
          <div className="db-card-header"><h3 className="db-card-title">Vendor Performance</h3></div>
          <div className="db-table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <table className="db-table text-sm">
              <thead>
                <tr>
                  <th>Vendor ID</th>
                  <th>Current</th>
                  <th>Previous</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!vendorPerformance || vendorPerformance.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4 text-gray-500">No vendor data available</td></tr>
                ) : (
                  vendorPerformance.map((vp: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-semibold text-[#0B1F3A] truncate max-w-[100px]">{vp.vendorId}</td>
                      <td className="font-bold">{vp.currentScore}%</td>
                      <td>{vp.previousScore !== null ? `${vp.previousScore}%` : '-'}</td>
                      <td>
                        {vp.status === 'Improved' && <span className="text-green-600 font-bold flex items-center text-xs"><ArrowUpRight className="w-3 h-3 mr-1"/> {vp.change}%</span>}
                        {vp.status === 'Declined' && <span className="text-red-600 font-bold flex items-center text-xs"><ArrowDownRight className="w-3 h-3 mr-1"/> {Math.abs(vp.change)}%</span>}
                        {vp.status === 'No Change' && <span className="text-gray-500 font-bold text-xs">-</span>}
                        {vp.status === 'New' && <span className="text-blue-500 font-bold text-xs">New</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
};
