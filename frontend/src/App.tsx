
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Home } from './pages/Home';
import { RoleAuth } from './pages/RoleAuth';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminCustomers } from './pages/AdminCustomers';
import { AdminVendors } from './pages/AdminVendors';
import { AdminAuditors } from './pages/AdminAuditors';
import { AdminAudits } from './pages/AdminAudits';
import { AdminCreateAudit } from './pages/AdminCreateAudit';
import { AdminAuditDetails } from './pages/AdminAuditDetails';
import { AdminChecklist } from './pages/AdminChecklist';
import { AdminAnalytics } from './pages/AdminAnalytics';
import { AdminReports } from './pages/AdminReports';
import { AdminReportDetails } from './pages/AdminReportDetails';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { CustomerVendors } from './pages/CustomerVendors';
import { CustomerVendorDetails } from './pages/CustomerVendorDetails';
import { CustomerAudits } from './pages/CustomerAudits';
import { CustomerAuditDetails } from './pages/CustomerAuditDetails';
import { CustomerTimeline } from './pages/CustomerTimeline';
import { CustomerComplianceScores } from './pages/CustomerComplianceScores';
import { CustomerReports } from './pages/CustomerReports';
import { CustomerNotifications } from './pages/CustomerNotifications';
import { CustomerOverallPPT } from './pages/CustomerOverallPPT';
import { CustomerOverallReport } from './pages/CustomerOverallReport';
import { VendorDashboard } from './pages/VendorDashboard';
import { VendorProfile } from './pages/VendorProfile';
import { VendorAudits } from './pages/VendorAudits';
import { VendorAuditDetails } from './pages/VendorAuditDetails';
import { VendorDocuments } from './pages/VendorDocuments';
import { VendorFindings } from './pages/VendorFindings';
import { VendorTimeline } from './pages/VendorTimeline';
import { VendorReports } from './pages/VendorReports';
import { VendorNotifications } from './pages/VendorNotifications';
import { VendorContact } from './pages/VendorContact';
import { ComplianceCalculatorPage } from './pages/ComplianceCalculator';
import { useAuth } from './context/AuthContext';

// A wrapper for the Calculator to include the Header with Logout
import { UserHeaderMenu } from './components/UserHeaderMenu';
import { ShieldCheck, Search, Bell } from 'lucide-react';
import './components/DashboardLayout.css'; // Import the new styles

const CalculatorWithHeader = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="brand-logo">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <span className="brand-name hidden sm:block">Compliance Platform</span>
          </div>
        </div>
        
        <div className="header-center hidden md:flex">
          <div className="search-bar">
            <Search className="search-icon" />
            <input type="text" placeholder="Search audits, vendors..." />
          </div>
        </div>

        <div className="header-right">
          <button className="icon-btn">
            <Bell className="h-5 w-5" />
            <span className="notification-dot"></span>
          </button>
          <UserHeaderMenu portalTitle="Auditor Portal" />
        </div>
      </header>
      <div className="flex-1">
        <AuditProvider>
          <ComplianceCalculatorPage />
        </AuditProvider>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          
          <Route path="/login/:role" element={<RoleAuth />} />
          <Route path="/register/:role" element={<RoleAuth />} />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/customers" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminCustomers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/vendors" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminVendors />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/auditors" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminAuditors />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/audits" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminAudits />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/audits/create" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminCreateAudit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/audits/:id" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminAuditDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/checklist" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminChecklist />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/analytics" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/reports/:id" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminReportDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/vendors" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerVendors />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/vendors/:vendorId" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerVendorDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/audits" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerAudits />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/audits/:auditId" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerAuditDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/timeline" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerTimeline />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/audit-timeline" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerTimeline />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/scores" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerComplianceScores />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/compliance-scores" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerComplianceScores />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/reports" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/notifications" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerNotifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/overall-ppt" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerOverallPPT />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/overall-report" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerOverallReport />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor/profile" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor/audits" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorAudits />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor/audits/:id" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorAuditDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor/documents" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorDocuments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor/findings" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorFindings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor/timeline" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorTimeline />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor/reports" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor/notifications" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorNotifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vendor/contact" 
            element={
              <ProtectedRoute allowedRoles={['Vendor']}>
                <VendorContact />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/auditor" 
            element={
              <ProtectedRoute allowedRoles={['Auditor']}>
                <CalculatorWithHeader />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
