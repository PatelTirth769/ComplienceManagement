
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, ArrowLeft } from 'lucide-react';
import '../components/DashboardLayout.css';

export const SimpleDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 text-[#0B1F3A]">
              <ShieldCheck className="h-6 w-6 text-[#1565C0]" />
              <span className="font-bold text-lg">Compliance Platform</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 bg-[#EAF4FF] px-3 py-1 rounded-full border border-[#bfdbfe] font-medium">
                Role: {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1565C0] font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button 
          type="button" 
          onClick={handleBack} 
          className="dashboard-content-back-btn mb-4"
          title="Back"
        >
          <ArrowLeft className="back-icon" />
          <span>Back</span>
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-[#0B1F3A] mb-4">
            Welcome to the {user?.role} Dashboard
          </h1>
          <p className="text-gray-600">
            Hello, {user?.name}. You are logged in as a <strong>{user?.role}</strong>.
          </p>
          <div className="mt-8 p-6 bg-[#EAF4FF] rounded-lg border border-[#bfdbfe]">
            <h2 className="text-lg font-semibold text-[#1565C0] mb-2">Notice</h2>
            <p className="text-sm text-[#0B1F3A]">
              Additional business functionality for the {user?.role} role will be implemented here soon.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
