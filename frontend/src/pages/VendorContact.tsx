import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare, Mail, Phone, Briefcase, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { getAuditorContact } from '../services/api';

export const VendorContact: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [auditor, setAuditor] = useState<any>(null);

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor' },
    { name: 'My Profile', icon: User, path: '/vendor/profile' },
    { name: 'My Audits', icon: FileCheck, path: '/vendor/audits' },
    { name: 'Documents', icon: FolderOpen, path: '/vendor/documents' },
    { name: 'Findings & Actions', icon: AlertTriangle, path: '/vendor/findings' },
    { name: 'Audit Timeline', icon: Clock, path: '/vendor/timeline' },
    { name: 'Reports', icon: BarChart3, path: '/vendor/reports' },
    { name: 'Notifications', icon: Bell, path: '/vendor/notifications' },
    { name: 'Contact Auditor', icon: MessageSquare, active: true, path: '/vendor/contact' }
  ];

  useEffect(() => {
    const fetchAuditor = async () => {
      try {
        const response = await getAuditorContact();
        if (response.success && response.data) {
          setAuditor(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch auditor contact', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAuditor();
  }, []);

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
      `}</style>

      {/* Header Banner */}
      <div style={{ marginBottom: '1.75rem', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare style={{ width: '20px', height: '20px', color: '#1565C0' }} />
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>Contact Auditor</h1>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, paddingLeft: '2.875rem' }}>
          Direct communication channel for your assigned compliance auditor.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {auditor ? (
          <div style={{
            background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
            overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', animation: 'fadeIn 0.4s ease 0.1s both'
          }}>
            {/* Card Hero Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0B1F3A 0%, #1565C0 100%)',
              padding: '2rem 1.5rem', textAlign: 'center', color: 'white', position: 'relative'
            }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(4px)',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <User style={{ width: '36px', height: '36px', color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 0.25rem', letterSpacing: '-0.01em' }}>{auditor.name}</h3>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '0.2rem 0.75rem', borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.15)', color: '#93C5FD',
                fontSize: '0.775rem', fontWeight: 700
              }}>
                <ShieldCheck style={{ width: '13px', height: '13px' }} />
                {auditor.specialization || 'Compliance Officer'}
              </span>
            </div>

            {/* Contact Details List */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                
                {/* Email Item */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: '#FAFCFF', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail style={{ width: '18px', height: '18px', color: '#1565C0' }} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Email Address
                    </div>
                    <a href={`mailto:${auditor.email}`} style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0B1F3A', textDecoration: 'none' }}>
                      {auditor.email}
                    </a>
                  </div>
                </div>

                {/* Phone Item */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: '#FAFCFF', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone style={{ width: '18px', height: '18px', color: '#059669' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Phone Number
                    </div>
                    <a href={`tel:${auditor.phone}`} style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0B1F3A', textDecoration: 'none' }}>
                      {auditor.phone}
                    </a>
                  </div>
                </div>

                {/* Role Item */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: '#FAFCFF', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Briefcase style={{ width: '18px', height: '18px', color: '#7C3AED' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Role & Responsibility
                    </div>
                    <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0B1F3A' }}>
                      Lead Compliance Auditor
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <a 
                href={`mailto:${auditor.email}`} 
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.875rem 1.5rem', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                  color: 'white', fontWeight: 700, fontSize: '0.925rem',
                  textDecoration: 'none', boxShadow: '0 4px 12px rgba(21, 101, 192, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Mail style={{ width: '18px', height: '18px' }} />
                Send Email to Auditor
              </a>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
            padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F8FAFC', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <User style={{ width: '32px', height: '32px', color: '#94A3B8' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.5rem' }}>No Auditor Assigned</h3>
            <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
              An auditor will be assigned to your profile once an active audit is scheduled.
            </p>
          </div>
        )}

        {/* Communication Guidelines Card */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.5rem', animation: 'fadeIn 0.4s ease 0.2s both'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare style={{ width: '16px', height: '16px', color: '#D97706' }} />
            </div>
            <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Communication Guidelines</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { title: 'Clarifications & Inquiries', text: 'Contact your auditor for questions regarding checklist statutory requirements or specific compliance criteria.' },
              { title: 'Secure Document Uploads', text: 'Do not send sensitive documents via email attachment. Upload files securely through the Documents tab in this portal.' },
              { title: 'SLA Response Times', text: 'Auditors typically respond to official inquiries within 24 to 48 business hours.' }
            ].map((guide, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem', borderRadius: '10px', background: '#FAFCFF', border: '1px solid #F1F5F9' }}>
                <CheckCircle2 style={{ width: '18px', height: '18px', color: '#1565C0', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.8375rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '2px' }}>{guide.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.45 }}>{guide.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
