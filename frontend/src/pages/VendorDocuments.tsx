import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare, Upload, FileText, Download, CheckCircle2,
  FileCheck2, ShieldCheck, ChevronDown
} from 'lucide-react';
import { getVendorDashboardStats, uploadVendorDocument, getVendorDocuments, getVendorDocumentUrl, getVendorAudits } from '../services/api';

export const VendorDocuments: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [audits, setAudits] = useState<any[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [activeAudit, setActiveAudit] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [docType, setDocType] = useState('General');

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/vendor' },
    { name: 'My Profile', icon: User, path: '/vendor/profile' },
    { name: 'My Audits', icon: FileCheck, path: '/vendor/audits' },
    { name: 'Documents', icon: FolderOpen, active: true, path: '/vendor/documents' },
    { name: 'Findings & Actions', icon: AlertTriangle, path: '/vendor/findings' },
    { name: 'Audit Timeline', icon: Clock, path: '/vendor/timeline' },
    { name: 'Reports', icon: BarChart3, path: '/vendor/reports' },
    { name: 'Notifications', icon: Bell, path: '/vendor/notifications' },
    { name: 'Contact Auditor', icon: MessageSquare, path: '/vendor/contact' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const auditsRes = await getVendorAudits();
        if (auditsRes.success && auditsRes.data && auditsRes.data.length > 0) {
          const auditList = auditsRes.data;
          setAudits(auditList);
          
          const active = auditList.find((a: any) => 
            ['scheduled', 'in progress', 'active'].includes((a.status || '').toLowerCase())
          ) || auditList[0];
          
          setSelectedAuditId(active.id);
          setActiveAudit(active);

          const docsResponse = await getVendorDocuments(active.id);
          if (docsResponse.success) {
            setDocuments(docsResponse.data);
          }
        } else {
          // Fallback to dashboard stats if getVendorAudits returned no data
          const response = await getVendorDashboardStats();
          if (response.success && response.data.activeAudit) {
            const audit = response.data.activeAudit;
            setAudits([audit]);
            setSelectedAuditId(audit.id);
            setActiveAudit(audit);
            
            const docsResponse = await getVendorDocuments(audit.id);
            if (docsResponse.success) {
              setDocuments(docsResponse.data);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch vendor audits/documents', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAuditChange = async (auditId: string) => {
    setSelectedAuditId(auditId);
    const target = audits.find((a: any) => a.id === auditId);
    if (target) {
      setActiveAudit(target);
      try {
        const docsResponse = await getVendorDocuments(target.id);
        if (docsResponse.success) {
          setDocuments(docsResponse.data);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error('Failed to fetch documents for audit', error);
        setDocuments([]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload || !activeAudit) return;
    
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(fileToUpload);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        const response = await uploadVendorDocument(activeAudit.id, {
          fileName: fileToUpload.name,
          fileData: base64Data,
          type: docType
        });
        
        if (response.success) {
          alert('Document uploaded successfully!');
          setDocuments(response.data);
          setFileToUpload(null);
          setDocType('General');
          const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } else {
          alert(response.error || 'Failed to upload document.');
        }
      };
      reader.onerror = (error) => {
        console.error('Error converting file to base64', error);
        alert('Error preparing file for upload.');
      };
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const response = await getVendorDocumentUrl(doc.id);
      if (response.success) {
        if (response.isUrl) {
          window.open(response.data, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = response.data;
          a.download = response.fileName || doc.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else {
        alert('Could not download document.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading document.');
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
        .select-field {
          width: 100%;
          padding: 0.75rem 2.5rem 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          font-size: 0.9rem;
          color: #0B1F3A;
          outline: none;
          background: #FFFFFF;
          appearance: none;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .select-field:focus {
          border-color: #1565C0;
          box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.12);
        }
      `}</style>

      {/* Header Banner */}
      <div style={{ marginBottom: '1.75rem', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen style={{ width: '20px', height: '20px', color: '#1565C0' }} />
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>Audit Documents</h1>
        </div>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, paddingLeft: '2.875rem' }}>
          Upload and manage compliance documents required for your active audit evaluation.
        </p>
      </div>

      {!activeAudit ? (
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
          padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F8FAFC', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <FolderOpen style={{ width: '32px', height: '32px', color: '#94A3B8' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.5rem' }}>No Active Audit</h3>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
            Document submission is available when an audit is scheduled or in progress for your account.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Upload Document Panel */}
          <div style={{
            background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.5rem', animation: 'fadeIn 0.4s ease 0.1s both'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload style={{ width: '16px', height: '16px', color: '#1565C0' }} />
              </div>
              <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Upload Document</h3>
            </div>

            {/* Select Target Audit */}
            {audits.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.375rem' }}>
                  Select Audit
                </label>
                <div style={{ position: 'relative' }}>
                  <select 
                    className="select-field"
                    value={selectedAuditId}
                    onChange={(e) => handleAuditChange(e.target.value)}
                  >
                    {audits.map((audit) => (
                      <option key={audit.id} value={audit.id}>
                        {audit.auditPeriod || 'Audit'} ({audit.auditIdString || audit.id}) - {audit.status || 'Active'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8', pointerEvents: 'none' }} />
                </div>
              </div>
            )}

            {/* Select Document Type */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.375rem' }}>
                Document Category
              </label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="select-field"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="General">General Compliance</option>
                  <option value="License">License & Registration</option>
                  <option value="Policy">Company Policy / Standing Orders</option>
                  <option value="Payroll">Payroll & Muster Rolls</option>
                  <option value="Proof">Challans & Proof of Payment</option>
                </select>
                <ChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Select File Dropzone */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.375rem' }}>
                Select File
              </label>

              <label 
                htmlFor="file-upload-input"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '1.5rem 1rem', borderRadius: '12px',
                  border: '2px dashed #CBD5E1', background: '#F8FAFC',
                  cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#1565C0';
                  (e.currentTarget as HTMLElement).style.background = '#EFF6FF';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1';
                  (e.currentTarget as HTMLElement).style.background = '#F8FAFC';
                }}
              >
                <Upload style={{ width: '28px', height: '28px', color: '#1565C0', marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1565C0', marginBottom: '0.25rem' }}>
                  Choose file to upload
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>PDF, PNG, JPG up to 10MB</span>
                <input 
                  id="file-upload-input"
                  type="file" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange} 
                />
              </label>

              {fileToUpload && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: '8px',
                  background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600
                }}>
                  <FileText style={{ width: '16px', height: '16px', color: '#10B981', flexShrink: 0 }} />
                  <span style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileToUpload.name}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button 
              onClick={handleUpload}
              disabled={!fileToUpload || isUploading}
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                background: !fileToUpload || isUploading ? '#CBD5E1' : 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                color: 'white', fontWeight: 700, fontSize: '0.9rem',
                border: 'none', cursor: !fileToUpload || isUploading ? 'not-allowed' : 'pointer',
                boxShadow: fileToUpload && !isUploading ? '0 4px 12px rgba(21, 101, 192, 0.25)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Upload style={{ width: '16px', height: '16px' }} />
              {isUploading ? 'Uploading to S3...' : 'Submit Document'}
            </button>
          </div>

          {/* Uploaded Documents List */}
          <div style={{
            background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
            boxShadow: '0 1px 6px rgba(0,0,0,0.04)', padding: '1.5rem', animation: 'fadeIn 0.4s ease 0.2s both'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck2 style={{ width: '16px', height: '16px', color: '#059669' }} />
                </div>
                <h3 style={{ fontWeight: 700, color: '#0B1F3A', fontSize: '1.05rem', margin: 0 }}>Uploaded Documents</h3>
              </div>
              <span style={{
                background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE',
                padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700
              }}>
                {documents.length} Files Uploaded
              </span>
            </div>

            {documents.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8375rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>File Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Date Uploaded</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFCFF' }}>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#0B1F3A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <FileText style={{ width: '18px', height: '18px', color: '#1565C0', flexShrink: 0 }} />
                            <span style={{ wordBreak: 'break-all' }}>{doc.fileName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: '#475569', fontWeight: 500 }}>{doc.type}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '0.2rem 0.625rem', borderRadius: '999px',
                            background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
                            fontSize: '0.725rem', fontWeight: 700
                          }}>
                            <CheckCircle2 style={{ width: '12px', height: '12px', color: '#10B981' }} />
                            {doc.status || 'Uploaded'}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: '#64748B' }}>
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleDownload(doc)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                              padding: '0.375rem 0.75rem', borderRadius: '8px',
                              background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE',
                              fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Download style={{ width: '14px', height: '14px' }} />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '3.5rem 1.5rem',
                borderRadius: '12px', border: '2px dashed #E2E8F0', background: '#FAFCFF'
              }}>
                <FolderOpen style={{ width: '44px', height: '44px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.375rem', fontSize: '1rem' }}>No Documents Uploaded Yet</h4>
                <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0, maxWidth: '340px', marginInline: 'auto' }}>
                  Upload required compliance certificates, licenses, or payroll documents using the form on the left.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
