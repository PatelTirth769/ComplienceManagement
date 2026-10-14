import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare, Send, CheckCircle2, Info, Layers
} from 'lucide-react';
import { getVendorFindings, respondToVendorFinding, getVendorAudits } from '../services/api';

export const VendorFindings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [findings, setFindings] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [activeFinding, setActiveFinding] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('ALL');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor' },
    { name: 'My Profile', icon: User, path: '/vendor/profile' },
    { name: 'My Audits', icon: FileCheck, path: '/vendor/audits' },
    { name: 'Documents', icon: FolderOpen, path: '/vendor/documents' },
    { name: 'Findings & Actions', icon: AlertTriangle, active: true, path: '/vendor/findings' },
    { name: 'Audit Timeline', icon: Clock, path: '/vendor/timeline' },
    { name: 'Reports', icon: BarChart3, path: '/vendor/reports' },
    { name: 'Notifications', icon: Bell, path: '/vendor/notifications' },
    { name: 'Contact Auditor', icon: MessageSquare, path: '/vendor/contact' }
  ];

  const fetchData = async () => {
    try {
      const [findingsRes, auditsRes] = await Promise.all([
        getVendorFindings(),
        getVendorAudits().catch(() => ({ success: false, data: [] }))
      ]);

      if (findingsRes.success) {
        setFindings(findingsRes.data || []);
      }
      if (auditsRes.success && Array.isArray(auditsRes.data)) {
        setAudits(auditsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch findings', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitResponse = async () => {
    if (!activeFinding || !responseText.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await respondToVendorFinding({
        auditId: activeFinding.auditId,
        findingId: activeFinding.id,
        index: activeFinding.index,
        itemId: activeFinding.itemId,
        itemCategory: activeFinding.category,
        itemText: activeFinding.item,
        responseText: responseText.trim()
      });
      
      if (response.success) {
        alert('Corrective action response submitted successfully!');
        setResponseText('');
        setActiveFinding(null);
        await fetchData();
      } else {
        alert(response.error || 'Failed to submit response.');
      }
    } catch (error: any) {
      console.error('Failed to submit response', error);
      alert(error.response?.data?.error || 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Collect all unique audit periods from audits list and findings list
  const auditPeriodList = Array.from(new Set([
    ...audits.map(a => a.auditPeriod),
    ...findings.map(f => f.auditPeriod)
  ].filter(Boolean)));

  const displayedFindings = selectedPeriodFilter === 'ALL' 
    ? findings 
    : findings.filter(f => f.auditPeriod === selectedPeriodFilter);

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
      <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle style={{ width: '20px', height: '20px', color: '#DC2626' }} />
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>Findings & Corrective Actions</h1>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, paddingLeft: '2.875rem' }}>
          Review non-compliance observations raised by the auditor and submit mandatory corrective action plans.
        </p>
      </div>

      {/* Audit Selector Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem',
        background: 'white', padding: '0.75rem 1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)', animation: 'fadeIn 0.35s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8375rem', fontWeight: 700, color: '#0B1F3A', marginRight: '0.25rem', flexShrink: 0 }}>
          <Layers style={{ width: '16px', height: '16px', color: '#1565C0' }} />
          Select Audit Period:
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedPeriodFilter('ALL')}
            style={{
              padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 700,
              background: selectedPeriodFilter === 'ALL' ? 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)' : '#F8FAFC',
              color: selectedPeriodFilter === 'ALL' ? 'white' : '#475569',
              border: `1px solid ${selectedPeriodFilter === 'ALL' ? '#1565C0' : '#CBD5E1'}`,
              cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: selectedPeriodFilter === 'ALL' ? '0 2px 8px rgba(21, 101, 192, 0.25)' : 'none'
            }}
          >
            All Audits ({findings.length})
          </button>
          
          {auditPeriodList.map(period => {
            const count = findings.filter(f => f.auditPeriod === period).length;
            const isSelected = selectedPeriodFilter === period;
            return (
              <button
                key={period}
                onClick={() => setSelectedPeriodFilter(period)}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 700,
                  background: isSelected ? 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)' : '#F8FAFC',
                  color: isSelected ? 'white' : '#475569',
                  border: `1px solid ${isSelected ? '#1565C0' : '#CBD5E1'}`,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  boxShadow: isSelected ? '0 2px 8px rgba(21, 101, 192, 0.25)' : 'none'
                }}
              >
                <span>{period}</span>
                <span style={{
                  fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: '4px',
                  background: isSelected ? 'rgba(255,255,255,0.2)' : '#E2E8F0',
                  color: isSelected ? 'white' : '#64748B'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: All Findings List */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden', animation: 'fadeIn 0.4s ease 0.1s both'
        }}>
          <div style={{
            padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FAFCFF',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>
              {selectedPeriodFilter === 'ALL' ? 'All Audit Findings' : `Findings for ${selectedPeriodFilter}`}
            </h3>
            <span style={{
              background: displayedFindings.length > 0 ? '#FEF2F2' : '#ECFDF5',
              color: displayedFindings.length > 0 ? '#DC2626' : '#059669',
              border: `1px solid ${displayedFindings.length > 0 ? '#FECACA' : '#A7F3D0'}`,
              padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700
            }}>
              {displayedFindings.length} Items Found
            </span>
          </div>

          {displayedFindings.length > 0 ? (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {displayedFindings.map((finding) => {
                const isSelected = activeFinding?.id === finding.id;
                const isResponded = finding.status === 'Responded';
                return (
                  <div 
                    key={finding.id} 
                    onClick={() => setActiveFinding(finding)}
                    style={{
                      padding: '1.25rem 1.5rem', cursor: 'pointer',
                      borderBottom: '1px solid #F1F5F9',
                      borderLeft: isSelected ? '4px solid #1565C0' : '4px solid transparent',
                      background: isSelected ? '#EFF6FF' : 'white',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.725rem', fontWeight: 700, color: '#1565C0',
                        background: '#EFF6FF', border: '1px solid #BFDBFE',
                        padding: '0.15rem 0.5rem', borderRadius: '6px'
                      }}>
                        {finding.category || 'General'}
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '0.15rem 0.5rem', borderRadius: '999px',
                        background: isResponded ? '#ECFDF5' : '#FFFBEB',
                        color: isResponded ? '#065F46' : '#92400E',
                        border: `1px solid ${isResponded ? '#A7F3D0' : '#FDE68A'}`,
                        fontSize: '0.725rem', fontWeight: 700
                      }}>
                        {isResponded ? <CheckCircle2 style={{ width: '12px', height: '12px' }} /> : <AlertTriangle style={{ width: '12px', height: '12px' }} />}
                        {finding.status}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0B1F3A', margin: '0 0 0.375rem', lineHeight: 1.35 }}>
                      {finding.item}
                    </h4>

                    <div style={{ fontSize: '0.775rem', color: '#64748B' }}>
                      Audit Period: <strong style={{ color: '#0B1F3A' }}>{finding.auditPeriod || 'N/A'}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle2 style={{ width: '28px', height: '28px', color: '#10B981' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#059669', margin: '0 0 0.375rem' }}>No Non-Compliances Found</h3>
              <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0, maxWidth: '340px', marginInline: 'auto' }}>
                You currently have no open audit findings or pending corrective action items.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Finding Details & Action Form */}
        <div style={{ position: 'sticky', top: '1.5rem', animation: 'fadeIn 0.4s ease 0.2s both' }}>
          {activeFinding ? (
            <div style={{
              background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
              boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info style={{ width: '16px', height: '16px', color: '#1565C0' }} />
                </div>
                <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Finding Details</h3>
              </div>

              {/* Requirement Text */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                  Requirement Description
                </label>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0B1F3A', lineHeight: 1.45 }}>
                  {activeFinding.item}
                </div>
              </div>

              {/* Auditor Remarks */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                  Auditor Remarks & Observations
                </label>
                <div style={{
                  background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A',
                  padding: '0.875rem', fontSize: '0.8375rem', color: '#92400E', fontStyle: 'italic', lineHeight: 1.45
                }}>
                  {activeFinding.remarks || 'No specific remarks recorded.'}
                </div>
              </div>

              {/* Corrective Action Form / Response Display */}
              {activeFinding.status === 'Responded' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                    Submitted Corrective Action Plan
                  </label>
                  <div style={{
                    background: '#ECFDF5', borderRadius: '10px', border: '1px solid #A7F3D0',
                    padding: '0.875rem', fontSize: '0.8375rem', color: '#065F46', lineHeight: 1.45
                  }}>
                    {activeFinding.vendorResponse}
                  </div>
                  {activeFinding.respondedAt && (
                    <div style={{ fontSize: '0.725rem', color: '#94A3B8', textAlign: 'right', marginTop: '0.375rem' }}>
                      Submitted on {new Date(activeFinding.respondedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#0B1F3A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                    Submit Corrective Action Plan
                  </label>
                  <textarea 
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '10px',
                      border: '1px solid #CBD5E1', fontSize: '0.8375rem', color: '#0B1F3A',
                      outline: 'none', height: '110px', resize: 'vertical', marginBottom: '1rem',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Describe your corrective action plan, resolution details, or references to uploaded proof..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                  <button 
                    onClick={handleSubmitResponse}
                    disabled={isSubmitting || !responseText.trim()}
                    style={{
                      width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                      background: isSubmitting || !responseText.trim() ? '#CBD5E1' : 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                      color: 'white', fontWeight: 700, fontSize: '0.9rem',
                      border: 'none', cursor: isSubmitting || !responseText.trim() ? 'not-allowed' : 'pointer',
                      boxShadow: responseText.trim() && !isSubmitting ? '0 4px 12px rgba(21, 101, 192, 0.25)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Send style={{ width: '16px', height: '16px' }} />
                    {isSubmitting ? 'Submitting Plan...' : 'Submit Corrective Action'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
              padding: '3rem 1.5rem', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
            }}>
              <Info style={{ width: '32px', height: '32px', color: '#94A3B8', margin: '0 auto 0.75rem' }} />
              <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>
                Select a finding from the list on the left to inspect auditor notes and submit your response.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
