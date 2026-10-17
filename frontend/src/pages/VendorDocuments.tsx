import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { 
  LayoutDashboard, User, FileCheck, FolderOpen, 
  AlertTriangle, Clock, BarChart3, Bell, MessageSquare, Upload, FileText, Download, CheckCircle2,
  FileCheck2, ShieldCheck, ChevronDown, Search, X, Calendar, FileUp, Loader2
} from 'lucide-react';
import { getVendorDashboardStats, uploadVendorDocument, getVendorDocuments, getVendorDocumentUrl, getVendorAudits } from '../services/api';

export const VendorDocuments: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [audits, setAudits] = useState<any[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [activeAudit, setActiveAudit] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
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

  const filteredDocs = documents.filter((doc: any) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (doc.fileName || '').toLowerCase().includes(term) || (doc.type || '').toLowerCase().includes(term);
    const matchesCategory = categoryFilter === 'ALL' || (doc.type || '').toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout title="Vendor Portal" sidebarItems={sidebarItems} hideBackButton={true}>
      {/* 1. Executive Page Header */}
      <div className="admin-page-header">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="admin-header-title">Audit Document Vault</h1>
            <span className="admin-header-badge">
              <span className="pulse-dot"></span> Evidence Repository
            </span>
          </div>
          <p className="admin-header-subtitle">
            Upload, verify, and manage statutory compliance evidence for ongoing and historical audit cycles.
          </p>
        </div>
      </div>

      {/* 2. KPI Summary Grid */}
      <div className="admin-kpi-grid-3col">
        <div className="admin-kpi-card blue">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Verified Documents</span>
            <div className="admin-kpi-icon-wrapper blue">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{documents.length} Files</div>
          <span className="admin-kpi-subtext">Filed in statutory compliance docket</span>
          <span className="admin-kpi-badge">Vault Active</span>
        </div>

        <div className="admin-kpi-card emerald">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Active Audit Scope</span>
            <div className="admin-kpi-icon-wrapper emerald">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">{activeAudit?.auditPeriod || 'Q3 2026'}</div>
          <span className="admin-kpi-subtext">{activeAudit?.auditIdString || 'Cycle Target'} · {activeAudit?.status || 'Active'}</span>
          <span className="admin-kpi-badge">In Scope</span>
        </div>

        <div className="admin-kpi-card indigo">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">Acceptance Standard</span>
            <div className="admin-kpi-icon-wrapper indigo">
              <FileUp className="w-5 h-5" />
            </div>
          </div>
          <div className="admin-kpi-value">PDF, PNG, JPG</div>
          <span className="admin-kpi-subtext">Up to 10 MB per verified file</span>
          <span className="admin-kpi-badge">Certified</span>
        </div>
      </div>

      {!activeAudit ? (
        <div className="vdocs-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F8FAFC', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <FolderOpen style={{ width: '32px', height: '32px', color: '#94A3B8' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.5rem' }}>No Active Audit Found</h3>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
            Document submission will become available once an audit cycle is scheduled or in progress for your vendor account.
          </p>
        </div>
      ) : (
        <div className="vdocs-layout-grid">
          {/* Left: Upload Document Card */}
          <div className="vdocs-card">
            <div className="vdocs-card-header">
              <div className="vdocs-card-title-group">
                <div className="vdocs-card-icon-box blue">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="vdocs-card-title">Upload Compliance Evidence</h3>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                Vault Ingestion
              </span>
            </div>

            <div className="vdocs-card-body">
              {/* Select Target Audit */}
              {audits.length > 0 && (
                <div className="vdocs-form-group">
                  <label className="vdocs-label">Select Audit Engagement</label>
                  <div className="vdocs-select-wrapper">
                    <select 
                      className="vdocs-select"
                      value={selectedAuditId}
                      onChange={(e) => handleAuditChange(e.target.value)}
                    >
                      {audits.map((audit) => (
                        <option key={audit.id} value={audit.id}>
                          {audit.auditPeriod || 'Audit'} ({audit.auditIdString || audit.id}) - {audit.status || 'Active'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="vdocs-select-arrow" />
                  </div>
                </div>
              )}

              {/* Select Document Type */}
              <div className="vdocs-form-group">
                <label className="vdocs-label">Document Category</label>
                <div className="vdocs-select-wrapper">
                  <select 
                    className="vdocs-select"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    <option value="General">General Compliance</option>
                    <option value="License">License & Statutory Registration</option>
                    <option value="Policy">Company Policy / Standing Orders</option>
                    <option value="Payroll">Payroll, Wages & Muster Rolls</option>
                    <option value="Proof">Challans & Proof of Payment (EPF/ESI)</option>
                  </select>
                  <ChevronDown className="vdocs-select-arrow" />
                </div>
              </div>

              {/* Select File Dropzone */}
              <div className="vdocs-form-group">
                <label className="vdocs-label">Select File Attachment</label>
                <label 
                  htmlFor="file-upload-input"
                  className="vdocs-dropzone"
                >
                  <div className="vdocs-dropzone-icon-circle">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="vdocs-dropzone-primary-text">
                    Choose statutory document
                  </span>
                  <span className="vdocs-dropzone-hint">
                    PDF, PNG, JPG (Max 10 MB)
                  </span>
                  <input 
                    id="file-upload-input"
                    type="file" 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange} 
                  />
                </label>

                {fileToUpload && (
                  <div className="vdocs-selected-chip">
                    <div className="vdocs-selected-info">
                      <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="vdocs-selected-name" title={fileToUpload.name}>
                        {fileToUpload.name}
                      </span>
                    </div>
                    <button 
                      type="button"
                      className="vdocs-selected-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileToUpload(null);
                        const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                onClick={handleUpload}
                disabled={!fileToUpload || isUploading}
                className={`vdocs-submit-btn ${!fileToUpload || isUploading ? 'disabled' : 'enabled'}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading to Vault...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Submit Document to Vault</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Uploaded Documents Table Card */}
          <div className="vdocs-card">
            <div className="vdocs-card-header">
              <div className="vdocs-card-title-group">
                <div className="vdocs-card-icon-box emerald">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h3 className="vdocs-card-title">Uploaded Documents Repository</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {documents.length} {documents.length === 1 ? 'File' : 'Files'} Uploaded
              </span>
            </div>

            <div className="table-toolbar" style={{ padding: '0.875rem 1.375rem', borderBottom: '1px solid #F1F5F9' }}>
              <div className="search-input-wrapper" style={{ maxWidth: '280px' }}>
                <Search className="search-input-icon" />
                <input 
                  type="text" 
                  placeholder="Filter uploaded files..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="General">General</option>
                  <option value="License">License</option>
                  <option value="Policy">Policy</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Proof">Proof</option>
                </select>
                <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                  Showing {filteredDocs.length} of {documents.length}
                </span>
              </div>
            </div>

            <div className="vdocs-card-body" style={{ padding: 0 }}>
              {filteredDocs.length > 0 ? (
                <div className="vdocs-table-container">
                  <table className="vdocs-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40%', minWidth: '220px' }}>File Name</th>
                        <th style={{ width: '18%', minWidth: '120px' }}>Category</th>
                        <th style={{ width: '15%', minWidth: '100px' }}>Status</th>
                        <th style={{ width: '15%', minWidth: '110px' }}>Date Uploaded</th>
                        <th style={{ width: '12%', minWidth: '100px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.map((doc: any, i: number) => {
                        const isPdf = (doc.fileName || '').toLowerCase().endsWith('.pdf');
                        const isImg = /\.(png|jpe?g|webp)$/i.test(doc.fileName || '');

                        return (
                          <tr key={doc.id || i}>
                            <td>
                              <div className="vdocs-filename-cell">
                                <div className="vdocs-file-icon">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <span className="vdocs-file-name-text" title={doc.fileName}>
                                    {doc.fileName}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {isPdf ? 'PDF Document' : isImg ? 'Image Evidence' : 'Compliance Attachment'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="vdocs-category-pill">
                                {doc.type || 'General'}
                              </span>
                            </td>
                            <td>
                              <span className="vdocs-status-pill">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {doc.status || 'Uploaded'}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                onClick={() => handleDownload(doc)}
                                className="vdocs-download-btn"
                                title="Download file"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : documents.length > 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748B' }}>
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No matching documents found</p>
                  <p className="text-xs text-slate-400 mt-1">Try refining your search keyword or category filter.</p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#FAFCFF' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                    <FolderOpen className="w-6 h-6 text-blue-500" />
                  </div>
                  <h4 style={{ fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem', fontSize: '1rem' }}>No Documents Uploaded Yet</h4>
                  <p style={{ color: '#64748B', fontSize: '0.8rem', margin: 0, maxWidth: '340px', marginInline: 'auto' }}>
                    Upload required compliance certificates, licenses, or payroll evidence using the form on the left.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
