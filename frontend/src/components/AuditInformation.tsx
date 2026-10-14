import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Calendar, User, Users, ClipboardCheck, Briefcase, FileCheck } from 'lucide-react';
import { useAudit } from '../context/AuditContext';
import { getAssignedAudits } from '../services/api';

export const AuditInformation: React.FC = () => {
  const {
    vendorTypes,
    selectedVendorType,
    setSelectedVendorType,
    auditInfo,
    updateAuditInfo,
    loadingVendorTypes,
    validationErrors
  } = useAudit();

  const [assignedAudits, setAssignedAudits] = useState<any[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const audits = await getAssignedAudits();
        if (audits && audits.length > 0) {
          setAssignedAudits(audits);
          // Auto-select first assigned audit if fields are empty
          handleSelectAudit(audits[0]);
        }
      } catch (e) {
        console.warn('Failed to load assigned audits', e);
      }
    };
    fetchAudits();
  }, []);

  const handleSelectAudit = (audit: any) => {
    if (!audit) return;
    setSelectedAuditId(audit.id);
    if (audit.vendorType) setSelectedVendorType(audit.vendorType);
    updateAuditInfo('organisation', audit.customerName || audit.organisation || audit.customer || '');
    updateAuditInfo('site', audit.site || 'Main Facility');
    updateAuditInfo('auditMonth', audit.auditPeriod || audit.auditMonth || '');
    updateAuditInfo('auditDate', audit.startDate || audit.auditDate || new Date().toISOString().split('T')[0]);
    updateAuditInfo('conductedAt', audit.conductedAt || 'Onsite Facility');
    updateAuditInfo('auditor', audit.auditorName || audit.auditor || 'ww');
    updateAuditInfo('vendorRepresentative', audit.vendorRepresentative || audit.vendorName || '');
    updateAuditInfo('clientRepresentative', audit.clientRepresentative || audit.customerName || '');
    updateAuditInfo('employeeCount', audit.employeeCount || 100);
  };

  return (
    <section className="card audit-info-card">
      <div className="card-header">
        <div className="card-title-group">
          <ClipboardCheck className="card-icon" />
          <h2 className="card-title">Audit Information</h2>
        </div>
      </div>

      <div className="audit-info-grid">
        {/* Select Assigned Audit Dropdown */}
        {assignedAudits.length > 0 && (
          <div className="form-group form-group-full">
            <label className="form-label font-bold text-[#1565C0] flex items-center gap-1.5" htmlFor="assignedAuditSelect">
              <FileCheck className="w-4 h-4 text-[#1565C0]" /> Select Assigned Audit to Evaluate
            </label>
            <div className="input-prefix-wrapper">
              <ClipboardCheck className="input-icon text-[#1565C0]" />
              <select
                id="assignedAuditSelect"
                className="form-control font-semibold bg-blue-50 border-blue-200 text-[#0B1F3A]"
                value={selectedAuditId}
                onChange={e => {
                  const selected = assignedAudits.find(a => a.id === e.target.value);
                  handleSelectAudit(selected);
                }}
              >
                {assignedAudits.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.auditIdString || a.id} — {a.auditPeriod} ({a.customerName || a.organisation || 'Client'} / {a.establishmentType || 'Facility'})
                  </option>
                ))}
              </select>
            </div>
            <p className="form-help text-blue-700">Selecting an assigned audit automatically populates vendor, client, and evaluation details.</p>
          </div>
        )}

        {/* Vendor Type Selection */}
        <div className="form-group form-group-full">
          <label className="form-label vendor-type-label" htmlFor="vendorType">
            Vendor Type <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Briefcase className="input-icon vendor-type-icon" />
            <select
              id="vendorType"
              className={`form-control vendor-type-select ${validationErrors.vendorType ? 'border-danger-ring' : ''}`}
              value={selectedVendorType}
              onChange={e => setSelectedVendorType(e.target.value)}
              disabled={loadingVendorTypes}
            >
              {loadingVendorTypes ? (
                <option value="">Loading vendor types...</option>
              ) : (
                vendorTypes.map(vt => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name} ({vt.code})
                  </option>
                ))
              )}
            </select>
          </div>
          {validationErrors.vendorType ? (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.vendorType}</p>
          ) : (
            <p className="form-help">Selecting a vendor type dynamically loads the appropriate compliance checklist.</p>
          )}
        </div>

        {/* Organisation */}
        <div className="form-group">
          <label className="form-label" htmlFor="organisation">
            Organisation <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Building2 className="input-icon" />
            <input
              type="text"
              id="organisation"
              className={`form-control ${validationErrors.organisation ? 'border-danger-ring' : ''}`}
              placeholder="e.g. ABC Logistics Pvt Ltd"
              value={auditInfo.organisation}
              onChange={e => updateAuditInfo('organisation', e.target.value)}
            />
          </div>
          {validationErrors.organisation && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.organisation}</p>
          )}
        </div>

        {/* Site */}
        <div className="form-group">
          <label className="form-label" htmlFor="site">
            Site / Location <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <MapPin className="input-icon" />
            <input
              type="text"
              id="site"
              className={`form-control ${validationErrors.site ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Mumbai Manufacturing Facility"
              value={auditInfo.site}
              onChange={e => updateAuditInfo('site', e.target.value)}
            />
          </div>
          {validationErrors.site && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.site}</p>
          )}
        </div>

        {/* Audit Month */}
        <div className="form-group">
          <label className="form-label" htmlFor="auditMonth">
            Audit Month <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Calendar className="input-icon" />
            <input
              type="text"
              id="auditMonth"
              className={`form-control ${validationErrors.auditMonth ? 'border-danger-ring' : ''}`}
              placeholder="e.g. September 2026"
              value={auditInfo.auditMonth}
              onChange={e => updateAuditInfo('auditMonth', e.target.value)}
            />
          </div>
          {validationErrors.auditMonth && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.auditMonth}</p>
          )}
        </div>

        {/* Date of Audit */}
        <div className="form-group">
          <label className="form-label" htmlFor="auditDate">
            Date of Audit <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Calendar className="input-icon" />
            <input
              type="date"
              id="auditDate"
              className={`form-control ${validationErrors.auditDate ? 'border-danger-ring' : ''}`}
              value={auditInfo.auditDate}
              onChange={e => updateAuditInfo('auditDate', e.target.value)}
            />
          </div>
          {validationErrors.auditDate && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.auditDate}</p>
          )}
        </div>

        {/* Conducted At */}
        <div className="form-group">
          <label className="form-label" htmlFor="conductedAt">
            Conducted At <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <MapPin className="input-icon" />
            <input
              type="text"
              id="conductedAt"
              className={`form-control ${validationErrors.conductedAt ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Onsite Facility"
              value={auditInfo.conductedAt}
              onChange={e => updateAuditInfo('conductedAt', e.target.value)}
            />
          </div>
          {validationErrors.conductedAt && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.conductedAt}</p>
          )}
        </div>

        {/* Auditor */}
        <div className="form-group">
          <label className="form-label" htmlFor="auditor">
            Auditor Name <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <User className="input-icon" />
            <input
              type="text"
              id="auditor"
              className={`form-control ${validationErrors.auditor ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Lead Auditor Name"
              value={auditInfo.auditor}
              onChange={e => updateAuditInfo('auditor', e.target.value)}
            />
          </div>
          {validationErrors.auditor && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.auditor}</p>
          )}
        </div>

        {/* Vendor Representative */}
        <div className="form-group">
          <label className="form-label" htmlFor="vendorRepresentative">
            Vendor Representative <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <User className="input-icon" />
            <input
              type="text"
              id="vendorRepresentative"
              className={`form-control ${validationErrors.vendorRepresentative ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Vendor Manager Name"
              value={auditInfo.vendorRepresentative}
              onChange={e => updateAuditInfo('vendorRepresentative', e.target.value)}
            />
          </div>
          {validationErrors.vendorRepresentative && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.vendorRepresentative}</p>
          )}
        </div>

        {/* Client Representative */}
        <div className="form-group">
          <label className="form-label" htmlFor="clientRepresentative">
            Client Representative <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <User className="input-icon" />
            <input
              type="text"
              id="clientRepresentative"
              className={`form-control ${validationErrors.clientRepresentative ? 'border-danger-ring' : ''}`}
              placeholder="e.g. Client Compliance Officer"
              value={auditInfo.clientRepresentative}
              onChange={e => updateAuditInfo('clientRepresentative', e.target.value)}
            />
          </div>
          {validationErrors.clientRepresentative && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.clientRepresentative}</p>
          )}
        </div>

        {/* Number of Employees */}
        <div className="form-group">
          <label className="form-label" htmlFor="employeeCount">
            Number of Employees <span className="text-danger">*</span>
          </label>
          <div className="input-prefix-wrapper">
            <Users className="input-icon" />
            <input
              type="number"
              min="0"
              id="employeeCount"
              className={`form-control ${validationErrors.employeeCount ? 'border-danger-ring' : ''}`}
              placeholder="e.g. 150"
              value={auditInfo.employeeCount}
              onChange={e => {
                const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                updateAuditInfo('employeeCount', val);
              }}
            />
          </div>
          {validationErrors.employeeCount && (
            <p className="text-xs text-danger mt-1 font-medium">{validationErrors.employeeCount}</p>
          )}
        </div>
      </div>
    </section>
  );
};
