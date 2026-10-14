import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    // Simulate an API call using the existing backend instruction
    try {
      // In a real app, you would call your API here:
      // await api.post('/auth/login', { email, password, role: displayRole });
      
      const mappedRole = displayRole === 'Auditee' || displayRole === 'Vendor' ? 'Vendor' : displayRole as any;
      await login(email, password, mappedRole);
      
      switch (mappedRole) {
        case 'Admin':
          navigate('/admin');
          break;
        case 'Customer':
          navigate('/customer');
          break;
        case 'Auditor':
          navigate('/auditor');
          break;
        case 'Vendor':
          navigate('/vendor');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#0B1F3A] mb-2">{displayRole} Login</h2>
          <p className="text-gray-500 text-sm">Please sign in to access your dashboard</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1565C0] focus:border-[#1565C0] sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#1565C0] focus:border-[#1565C0] sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#1565C0] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1565C0] transition-colors"
          >
            Sign In
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => navigate('/')}
            className="text-sm text-[#1565C0] hover:underline"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
