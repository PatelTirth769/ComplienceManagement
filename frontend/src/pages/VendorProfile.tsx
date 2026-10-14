import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare, Save,
  Mail, Phone, MapPin, Building2, ShieldCheck, CheckCircle2, Lock
} from 'lucide-react';
import { getVendorProfile, updateVendorProfile } from '../services/api';

export const VendorProfile: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [profile, setProfile] = useState<any>({
    name: '',
    email: '',
    contactPerson: '',
    phone: '',
    address: '',
    establishmentDetails: ''
  });

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor' },
    { name: 'My Profile', icon: User, active: true, path: '/vendor/profile' },
    { name: 'My Audits', icon: FileCheck, path: '/vendor/audits' },
    { name: 'Documents', icon: FolderOpen, path: '/vendor/documents' },
    { name: 'Findings & Actions', icon: AlertTriangle, path: '/vendor/findings' },
    { name: 'Audit Timeline', icon: Clock, path: '/vendor/timeline' },
    { name: 'Reports', icon: BarChart3, path: '/vendor/reports' },
    { name: 'Notifications', icon: Bell, path: '/vendor/notifications' },
    { name: 'Contact Auditor', icon: MessageSquare, path: '/vendor/contact' }
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getVendorProfile();
        if (response.success && response.data) {
          setProfile((prev: any) => ({
            ...prev,
            ...response.data
          }));
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await updateVendorProfile(profile);
      if (response.success) {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      }
    } catch (error) {
      console.error('Failed to update profile', error);
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '240px' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #EFF6FF',
            borderTop: '3px solid #1565C0', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .input-field {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.6rem;
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          font-size: 0.9rem;
          color: #0B1F3A;
          outline: none;
          background: #FFFFFF;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .input-field:focus {
          border-color: #1565C0;
          box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.12);
        }
        .input-field:read-only {
          background: #F8FAFC;
          color: #64748B;
          cursor: not-allowed;
          border-color: #E2E8F0;
        }
      `}</style>

      {/* Header Banner */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem', animation: 'fadeIn 0.3s ease'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User style={{ width: '20px', height: '20px', color: '#1565C0' }} />
            </div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>My Profile</h1>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, paddingLeft: '2.875rem' }}>
            Manage your company information, primary contacts, and establishment details.
          </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.625rem', borderRadius: '10px',
            background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
            color: 'white', fontWeight: 700, fontSize: '0.9rem',
            border: 'none', cursor: isSaving ? 'wait' : 'pointer',
            boxShadow: '0 4px 12px rgba(21, 101, 192, 0.25)',
            opacity: isSaving ? 0.7 : 1, transition: 'all 0.2s ease'
          }}
        >
          <Save style={{ width: '16px', height: '16px' }} />
          {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
        </button>
      </div>

      {/* Success Notification Banner */}
      {showSuccessToast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem', borderRadius: '12px',
          background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46',
          marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease'
        }}>
          <CheckCircle2 style={{ width: '20px', height: '20px', color: '#10B981', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Profile details updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          
          {/* Card 1: Company & Primary Contact */}
          <div style={{
            background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.5rem', animation: 'fadeIn 0.4s ease 0.1s both'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 style={{ width: '16px', height: '16px', color: '#1565C0' }} />
              </div>
              <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Company Information</h3>
            </div>

            {/* Field: Company Name */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.375rem' }}>
                Company / Vendor Name
              </label>
              <div style={{ position: 'relative' }}>
                <Building2 style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8' }} />
                <input 
                  type="text" 
                  name="name"
                  className="input-field"
                  placeholder="Enter company name"
                  value={profile.name || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Field: Email Address (Read-only) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A' }}>
                  Email Address
                </label>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '0.15rem 0.5rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Lock style={{ width: '10px', height: '10px' }} /> Verified Account
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8' }} />
                <input 
                  type="email" 
                  name="email"
                  className="input-field"
                  value={profile.email || ''}
                  readOnly
                />
              </div>
            </div>

            {/* Field: Contact Person */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.375rem' }}>
                Primary Contact Person
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8' }} />
                <input 
                  type="text" 
                  name="contactPerson"
                  className="input-field"
                  placeholder="e.g. John Doe"
                  value={profile.contactPerson || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Field: Phone Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.375rem' }}>
                Phone Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8' }} />
                <input 
                  type="text" 
                  name="phone"
                  className="input-field"
                  placeholder="+91 98765 43210"
                  value={profile.phone || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Address & Establishment */}
          <div style={{
            background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.5rem', animation: 'fadeIn 0.4s ease 0.2s both'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin style={{ width: '16px', height: '16px', color: '#7C3AED' }} />
              </div>
              <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Location & Industry Details</h3>
            </div>

            {/* Field: Address */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.375rem' }}>
                Registered Company Address
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin style={{ position: 'absolute', left: '12px', top: '14px', width: '16px', height: '16px', color: '#94A3B8' }} />
                <textarea 
                  name="address"
                  className="input-field"
                  style={{ height: '112px', resize: 'vertical', paddingTop: '0.75rem' }}
                  placeholder="Enter full address details..."
                  value={profile.address || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Field: Establishment Details */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.375rem' }}>
                Establishment Details / Industry Type
              </label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8' }} />
                <input 
                  type="text" 
                  name="establishmentDetails"
                  className="input-field"
                  placeholder="e.g. Security Services / Manufacturing / IT Facility"
                  value={profile.establishmentDetails || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Info Box */}
            <div style={{
              background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0',
              padding: '1rem', marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
            }}>
              <ShieldCheck style={{ width: '18px', height: '18px', color: '#1565C0', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Your profile information is used for generating compliance reports, vendor verifications, and official audit documentation.
              </p>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
};
