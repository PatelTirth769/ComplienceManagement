import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { getAdminSidebarItems } from '../utils/adminNavigation';
import { 
  Clock, CheckCircle2, Circle, Loader2, Eye, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';

export const AdminTimeline: React.FC = () => {
  const [audits, setAudits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All');

  const sidebarItems = getAdminSidebarItems('Audit Timeline');

  useEffect(() => {
    const fetchAudits = async () => {
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
    fetchAudits();
  }, []);

  const periods = ['All', ...Array.from(new Set(audits.map(a => a.auditPeriod || 'Q3 2026')))];

  const filteredAudits = selectedPeriod === 'All' 
    ? audits 
    : audits.filter(a => (a.auditPeriod || 'Q3 2026') === selectedPeriod);

  return (
    <DashboardLayout title="Admin Portal - Audit Timeline" sidebarItems={sidebarItems}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Global Audit Timeline</h1>
          <p className="text-xs text-slate-500 mt-1">Lifecycle milestones and timeline status across all vendor audits</p>
        </div>
        
        {/* Period Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
          {periods.map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedPeriod === period
                  ? 'bg-white text-[#1565C0] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin w-10 h-10 text-[#1565C0]" />
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="db-card text-center py-12">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Audits Found for {selectedPeriod}</h3>
          <p className="text-xs text-slate-500 mt-1">Try switching to a different audit period tab.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAudits.map((audit: any) => {
            const s = (audit.status || '').toLowerCase();
            const isClosed = s === 'closed' || s === 'completed' || s === 'approved';
            const isPendingSignOff = s === 'pending sign-off';
            const isStarted = s !== 'scheduled';

            return (
              <div key={audit.id} className="db-card p-6 border-l-4 border-l-[#1565C0]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-slate-900 text-lg">{audit.auditIdString}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#1565C0] border border-blue-200">
                        {audit.auditPeriod}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Vendor: <strong className="text-slate-700">{audit.vendorName || audit.vendorId}</strong> • Customer: <strong className="text-slate-700">{audit.customerName || audit.customerId}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isClosed 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : isPendingSignOff 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-blue-50 text-[#1565C0] border-blue-200'
                    }`}>
                      {audit.status}
                    </span>
                    <Link 
                      to={`/admin/audits/${audit.id}`} 
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#1565C0] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </Link>
                  </div>
                </div>

                {/* Horizontal / Grid Milestone Progress */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">1. Audit Scheduled</div>
                      <div className="text-[11px] text-slate-400">{new Date(audit.startDate || audit.createdAt || Date.now()).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isStarted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isStarted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className={`font-bold ${isStarted ? 'text-slate-900' : 'text-slate-400'}`}>2. In Progress</div>
                      <div className="text-[11px] text-slate-400">Auditor Evaluation</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isPendingSignOff || isClosed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isPendingSignOff || isClosed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className={`font-bold ${isPendingSignOff || isClosed ? 'text-slate-900' : 'text-slate-400'}`}>3. Auditor Submitted</div>
                      <div className="text-[11px] text-slate-400">Vendor Corrective Actions</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isClosed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isClosed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className={`font-bold ${isClosed ? 'text-slate-900' : 'text-slate-400'}`}>4. Audit Closed</div>
                      <div className="text-[11px] text-slate-400">Reviewer Sign-off Complete</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};
