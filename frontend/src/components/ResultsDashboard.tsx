import React, { useState } from 'react';
import { useAudit } from '../context/AuditContext';
import { ScoreMeter } from './ScoreMeter';
import { SummaryCards } from './SummaryCards';
import { CategoryScoreTable } from './CategoryScoreTable';
import { NonCompliantList } from './NonCompliantList';
import { Save, CheckCircle2, Building2, User, Calendar, MapPin, Users, Award, FileCheck, FileSpreadsheet } from 'lucide-react';
import { downloadAuditorExcel } from '../services/api';

export const ResultsDashboard: React.FC = () => {
  const {
    calculationResult,
    auditInfo,
    selectedVendorType,
    vendorTypes,
    saveAuditRecord,
    saving,
    savedAudit,
    checklist,
    responses
  } = useAudit();

  const [exportingExcel, setExportingExcel] = useState(false);

  if (!calculationResult) return null;

  const currentVendor = vendorTypes.find(v => v.id === selectedVendorType || v.code === calculationResult.vendorType);

  const handleDownloadExcel = async () => {
    try {
      setExportingExcel(true);
      const payloadResponses = checklist.map(item => ({
        itemId: item.id,
        status: responses[item.id]?.status || '',
        remarks: responses[item.id]?.remarks || ''
      }));

      const payload = {
        ...auditInfo,
        vendorType: selectedVendorType,
        responses: payloadResponses,
        auditId: savedAudit?.id
      };

      const blob = await downloadAuditorExcel(payload);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const auditIdStr = savedAudit?.auditIdString || savedAudit?.id || 'AUDIT';
      const periodStr = (auditInfo.auditMonth || 'Report').replace(/\s+/g, '_');
      link.download = `${auditIdStr}_${periodStr}_Complete-Audit.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download Excel error:', err);
      alert('Failed to generate and download Excel report. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <section id="results-section" className="results-dashboard-container">
      <div className="section-header-banner">
        <div className="flex items-center space-x-3">
          <div className="results-banner-icon-wrapper">
            <Award className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Audit Calculation Results & Compliance Report</h2>
            <p className="text-xs text-slate-500 font-medium">Final statutory compliance evaluation dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {savedAudit ? (
            <div className="saved-audit-badge">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Audit Saved (ID: {savedAudit.id})</span>
            </div>
          ) : (
            <button
              onClick={saveAuditRecord}
              disabled={saving}
              className="btn btn-primary btn-save-audit"
              title="Click to save audit record to Cloud Firestore database"
            >
              <Save className="w-4.5 h-4.5 mr-2" />
              <span>{saving ? 'Saving Audit Record...' : 'Save Audit Record'}</span>
            </button>
          )}

          <button
            onClick={handleDownloadExcel}
            disabled={exportingExcel}
            className="btn btn-emerald btn-download-excel"
            style={{
              background: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              fontWeight: 700,
              fontSize: '0.875rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: exportingExcel ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease-in-out',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
            title="Download complete audit as Excel workbook"
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
            <span>{exportingExcel ? 'Exporting...' : 'Download Excel'}</span>
          </button>
        </div>
      </div>

      {/* Main Score Meter */}
      <ScoreMeter summary={calculationResult.summary} />

      {/* Summary Cards Grid */}
      <SummaryCards summary={calculationResult.summary} />

      {/* Category Breakdown Table */}
      <CategoryScoreTable categoryScores={calculationResult.categoryScores} />

      {/* Non-Compliant Findings List */}
      <NonCompliantList items={calculationResult.nonCompliantItems} />

      {/* Audit Summary Metadata Box */}
      <div className="card audit-metadata-summary-card">
        <div className="card-header metadata-card-header">
          <div className="card-title-group">
            <div className="metadata-title-icon">
              <FileCheck className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="card-title text-base font-bold text-slate-900">Audit Summary & Metadata</h3>
              <p className="text-xs text-slate-500 font-normal">Recorded audit details and representative metadata</p>
            </div>
          </div>
          <span className="badge badge-neutral font-semibold">{currentVendor?.name || calculationResult.vendorType}</span>
        </div>

        <div className="metadata-grid">
          {/* Organisation */}
          <div className="metadata-item-box">
            <div className="metadata-box-header">
              <Building2 className="metadata-icon" />
              <span className="metadata-label">Organisation</span>
            </div>
            <div className="metadata-value">{auditInfo.organisation || 'N/A'}</div>
          </div>

          {/* Site */}
          <div className="metadata-item-box">
            <div className="metadata-box-header">
              <MapPin className="metadata-icon" />
              <span className="metadata-label">Site / Location</span>
            </div>
            <div className="metadata-value">{auditInfo.site || 'N/A'}</div>
          </div>

          {/* Audit Month & Date */}
          <div className="metadata-item-box">
            <div className="metadata-box-header">
              <Calendar className="metadata-icon" />
              <span className="metadata-label">Audit Month / Date</span>
            </div>
            <div className="metadata-value">
              {auditInfo.auditMonth || 'N/A'} {auditInfo.auditDate ? `(${auditInfo.auditDate})` : ''}
            </div>
          </div>

          {/* Lead Auditor */}
          <div className="metadata-item-box">
            <div className="metadata-box-header">
              <User className="metadata-icon" />
              <span className="metadata-label">Lead Auditor</span>
            </div>
            <div className="metadata-value">{auditInfo.auditor || 'N/A'}</div>
          </div>

          {/* Vendor Representative */}
          <div className="metadata-item-box">
            <div className="metadata-box-header">
              <User className="metadata-icon" />
              <span className="metadata-label">Vendor Representative</span>
            </div>
            <div className="metadata-value">{auditInfo.vendorRepresentative || 'N/A'}</div>
          </div>

          {/* Client Representative */}
          <div className="metadata-item-box">
            <div className="metadata-box-header">
              <User className="metadata-icon" />
              <span className="metadata-label">Client Representative</span>
            </div>
            <div className="metadata-value">{auditInfo.clientRepresentative || 'N/A'}</div>
          </div>

          {/* Employee Count */}
          <div className="metadata-item-box">
            <div className="metadata-box-header">
              <Users className="metadata-icon" />
              <span className="metadata-label">Employee Count</span>
            </div>
            <div className="metadata-value">
              {auditInfo.employeeCount !== '' ? `${auditInfo.employeeCount} Employees` : 'N/A'}
            </div>
          </div>

          {/* Conducted At */}
          <div className="metadata-item-box">
            <div className="metadata-box-header">
              <MapPin className="metadata-icon" />
              <span className="metadata-label">Conducted At</span>
            </div>
            <div className="metadata-value">{auditInfo.conductedAt || 'N/A'}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

