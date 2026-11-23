import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { getAdminSidebarItems } from '../utils/adminNavigation';
import { 
  Scale, Search, Save, CheckCircle2, AlertCircle, 
  RotateCcw, BookOpen, Layers, ShieldCheck, Sparkles,
  Check, FileText, Plus, X, Paperclip, Download, Trash2
} from 'lucide-react';
import { getActRules, saveActRules, saveActRuleById, type ActRule, type ActRuleAttachment } from '../services/api';
import { downloadActRuleAttachment } from '../utils/actLawMatcher';

export const AdminRules: React.FC = () => {
  const sidebarItems = getAdminSidebarItems('Rules');

  const [rules, setRules] = useState<ActRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Saving states
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add custom Act modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newActForm, setNewActForm] = useState({
    actName: '',
    shortName: '',
    category: 'Labour & Employment Regulations',
    description: '',
    states: 'Central / All States'
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRules = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await getActRules();
      if (res.success && Array.isArray(res.rules)) {
        setRules(res.rules);
      } else {
        setErrorMsg('Unable to load Act rules.');
      }
    } catch (err: any) {
      console.error('Failed to fetch act rules:', err);
      setErrorMsg(err.message || 'Error fetching Act rules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleDescriptionChange = (id: string, newDesc: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, description: newDesc } : r));
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      setIsSavingAll(true);
      const res = await saveActRules(rules);
      if (res.success) {
        showToast('All statutory rules saved successfully!');
        setHasUnsavedChanges(false);
      } else {
        showToast(res.message || 'Failed to save rules', 'error');
      }
    } catch (err: any) {
      console.error('Error saving all rules:', err);
      showToast(err.message || 'Failed to save rules', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('File size exceeds 25MB limit', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result as string;
      const attachment: ActRuleAttachment = {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileData,
        uploadedAt: new Date().toISOString()
      };

      setRules(prev => prev.map(r => r.id === id ? { ...r, attachment } : r));
      setHasUnsavedChanges(true);
      showToast(`Attached "${file.name}". Click "Save Rule" to save.`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, attachment: null } : r));
    setHasUnsavedChanges(true);
    showToast('Attachment removed. Click "Save Rule" to persist changes.');
  };

  const handleSaveSingle = async (rule: ActRule) => {
    try {
      setSavingId(rule.id);
      const res = await saveActRuleById(rule.id, rule.description || '', rule.attachment);
      if (res.success) {
        setSavedRowId(rule.id);
        setTimeout(() => setSavedRowId(null), 2500);
        showToast(`Rule for "${rule.shortName}" saved!`);
      } else {
        showToast(res.message || 'Failed to save rule', 'error');
      }
    } catch (err: any) {
      console.error('Error saving single rule:', err);
      showToast(err.message || 'Failed to save rule', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleAddNewAct = () => {
    if (!newActForm.actName.trim()) {
      showToast('Please enter an Act Name', 'error');
      return;
    }
    const newId = `ACT-CUSTOM-${Date.now()}`;
    const newRuleItem: ActRule = {
      id: newId,
      actName: newActForm.actName.trim(),
      shortName: newActForm.shortName.trim() || newActForm.actName.trim().slice(0, 8),
      category: newActForm.category,
      states: newActForm.states.split(',').map(s => s.trim()).filter(Boolean),
      formsCount: 0,
      description: newActForm.description.trim()
    };

    const updated = [newRuleItem, ...rules];
    setRules(updated);
    setHasUnsavedChanges(true);
    setIsAddModalOpen(false);
    setNewActForm({ actName: '', shortName: '', category: 'Labour & Employment Regulations', description: '', states: 'Central / All States' });
    showToast(`Added Act "${newRuleItem.shortName}". Click "Save All Rules" to persist.`);
  };

  // Filter categories
  const categories = Array.from(new Set(rules.map(r => r.category).filter(Boolean)));

  const filteredRules = rules.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const actName = (r.actName || '').toLowerCase();
    const shortName = (r.shortName || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    const cat = (r.category || '').toLowerCase();
    const states = Array.isArray(r.states) ? r.states : [];

    const matchesSearch = !q || (
      actName.includes(q) ||
      shortName.includes(q) ||
      desc.includes(q) ||
      cat.includes(q) ||
      states.some(s => s && s.toLowerCase().includes(q))
    );

    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const configuredCount = rules.filter(r => (r.description || '').trim().length > 0 || Boolean(r.attachment?.fileData)).length;
  const pendingCount = rules.length - configuredCount;

  return (
    <DashboardLayout title="Admin Portal - Statutory Rules" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .rules-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 4px rgba(11, 31, 58, 0.03);
          transition: all 0.2s ease;
        }
        .rule-row-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(11, 31, 58, 0.03);
          transition: all 0.2s ease;
          overflow: hidden;
          margin-bottom: 1.25rem;
        }
        .rule-row-card:hover {
          border-color: #CBD5E1;
          box-shadow: 0 4px 12px rgba(11, 31, 58, 0.06);
        }
        .rule-textarea {
          width: 100%;
          min-height: 110px;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid #CBD5E1;
          font-size: 0.8375rem;
          line-height: 1.5;
          color: #0F172A;
          background: #FAFCFF;
          resize: vertical;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .rule-textarea:focus {
          border-color: #1565C0;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.1);
        }
      `}</style>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '0.75rem 1.25rem', borderRadius: '10px',
          background: toastMessage.type === 'success' ? '#047857' : '#DC2626',
          color: '#FFFFFF', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.85rem', fontWeight: 700,
          animation: 'fadeIn 0.25s ease'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
        
        {/* HEADER */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.65rem', borderRadius: '999px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1565C0', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              <Scale size={13} /> Statutory Governance & Rules
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
              Act Rules Management
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.25rem', margin: 0 }}>
              Configure and maintain statutory rules and vendor compliance guidelines for Core Acts from the reference checklist.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                background: '#FFFFFF', color: '#1E293B', fontSize: '0.8125rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} /> Add Custom Act
            </button>

            <button
              onClick={handleSaveAll}
              disabled={isSavingAll}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none',
                background: hasUnsavedChanges ? '#047857' : '#1565C0',
                color: '#FFFFFF', fontSize: '0.8125rem', fontWeight: 700,
                cursor: isSavingAll ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(21, 101, 192, 0.2)',
                transition: 'all 0.2s ease', opacity: isSavingAll ? 0.7 : 1
              }}
            >
              <Save size={16} />
              <span>{isSavingAll ? 'Saving All...' : hasUnsavedChanges ? 'Save All Rules *' : 'Save All Rules'}</span>
            </button>
          </div>
        </div>

        {/* SUMMARY KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Card 1: Total Core Acts */}
          <div className="rules-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Core Acts
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={18} color="#1565C0" />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0B1F3A', lineHeight: 1.1 }}>
              {rules.length}
            </div>
            <span style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
              Extracted from Reference Folder
            </span>
          </div>

          {/* Card 2: Rules Defined */}
          <div className="rules-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Rules Defined
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} color="#047857" />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#047857', lineHeight: 1.1 }}>
              {configuredCount}
            </div>
            <span style={{ fontSize: '0.725rem', color: '#065F46', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
              Active Compliance Mandates
            </span>
          </div>

          {/* Card 3: Pending Configuration */}
          <div className="rules-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Rules
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={18} color="#B45309" />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#B45309', lineHeight: 1.1 }}>
              {pendingCount}
            </div>
            <span style={{ fontSize: '0.725rem', color: '#92400E', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
              Require Rule Description
            </span>
          </div>

          {/* Card 4: Covered Jurisdictions */}
          <div className="rules-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Jurisdictions Covered
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={18} color="#475569" />
              </div>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0B1F3A', lineHeight: 1.1 }}>
              6 States + Central
            </div>
            <span style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 500, marginTop: '0.25rem', display: 'block' }}>
              MH, HR, MP, KA, TS, UP
            </span>
          </div>
        </div>

        {/* SEARCH & FILTER TOOLBAR */}
        <div className="rules-card" style={{ padding: '0.875rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search Act Name, short code (e.g. CLRA, PoB), or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '2.25rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem',
                  borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8125rem', outline: 'none', background: 'white'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                  fontSize: '0.8125rem', fontWeight: 600, color: '#1E293B', background: 'white', cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statutory Domains ({rules.length})</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {(searchQuery || selectedCategory !== 'ALL') && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #FECACA',
                    backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={13} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {isLoading ? (
          <div className="rules-card" style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{
              width: '40px', height: '40px', border: '3px solid #EFF6FF',
              borderTop: '3px solid #1565C0', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ color: '#64748B', fontSize: '0.875rem', fontWeight: 600 }}>Loading Core Statutory Acts and Rules...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : errorMsg ? (
          <div className="rules-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: '#FECACA', background: '#FEF2F2' }}>
            <AlertCircle style={{ width: '40px', height: '40px', color: '#DC2626', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: '0 0 0.5rem' }}>Failed to load Act rules</h3>
            <p style={{ color: '#B91C1C', fontSize: '0.8375rem', margin: '0 0 1.25rem' }}>{errorMsg}</p>
            <button
              onClick={fetchRules}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626',
                color: 'white', fontWeight: 700, fontSize: '0.8125rem', border: 'none', cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="rules-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Scale style={{ width: '44px', height: '44px', color: '#CBD5E1', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.25rem' }}>
              No matching Act rules found
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.8375rem', margin: 0 }}>
              Try adjusting your search terms or filter selection.
            </p>
          </div>
        ) : (
          /* CORE ACTS LIST: ACT NAME ON LEFT, DESCRIPTION FIELD IN FRONT ON RIGHT */
          <div>
            {/* Table Header Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(300px, 40%) minmax(360px, 60%)',
              gap: '1.5rem',
              padding: '0.75rem 1.25rem',
              color: '#64748B',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '1px solid #E2E8F0',
              marginBottom: '0.75rem'
            }}>
              <div>Act Name (Core Statutory Legislation)</div>
              <div>Rule Description (Compliance Mandate & Provisions)</div>
            </div>

            {/* List of Acts */}
            {filteredRules.map((rule, idx) => {
              const isDefined = (rule.description || '').trim().length > 0 || Boolean(rule.attachment?.fileData);
              const isRowSaving = savingId === rule.id;
              const isRowJustSaved = savedRowId === rule.id;

              return (
                <div key={rule.id || idx} className="rule-row-card">
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(300px, 40%) minmax(360px, 60%)',
                    gap: '1.5rem',
                    padding: '1.25rem',
                    alignItems: 'stretch'
                  }}>
                    {/* LEFT COLUMN: ACT NAME */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        {/* Act Short Badge & Domain */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800,
                            background: '#EFF6FF', color: '#1565C0', border: '1px solid #BFDBFE', fontFamily: 'monospace'
                          }}>
                            {rule.shortName}
                          </span>
                          <span style={{
                            padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.725rem', fontWeight: 600,
                            background: '#F1F5F9', color: '#475569'
                          }}>
                            {rule.category || 'General Labour Code'}
                          </span>
                        </div>

                        {/* Full Act Name */}
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0B1F3A', margin: '0 0 0.5rem', lineHeight: 1.35 }}>
                          {rule.actName}
                        </h3>

                        {/* Applicable States Coverage */}
                        {rule.states && rule.states.length > 0 && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                              Jurisdiction:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {rule.states.map((st, sIdx) => (
                                <span key={sIdx} style={{
                                  fontSize: '0.675rem', fontWeight: 600, color: '#334155',
                                  background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.1rem 0.45rem', borderRadius: '4px'
                                }}>
                                  {st}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Meta & Status */}
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.725rem', color: '#64748B' }}>
                          {rule.formsCount ? `${rule.formsCount} Forms / Registers in Checklist` : 'Standard Compliance'}
                        </span>

                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                          background: isDefined ? '#ECFDF5' : '#FFFBEB',
                          color: isDefined ? '#047857' : '#B45309',
                          border: isDefined ? '1px solid #A7F3D0' : '1px solid #FDE68A'
                        }}>
                          {isDefined ? '● Rule Defined' : '○ Pending Rule'}
                        </span>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: DESCRIPTION FIELD IN FRONT OF EVERY ACT */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Rule Description for {rule.shortName}:
                          </label>
                          <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                            {rule.description ? `${rule.description.length} chars` : 'Empty'}
                          </span>
                        </div>

                        <textarea
                          className="rule-textarea"
                          value={rule.description || ''}
                          onChange={(e) => handleDescriptionChange(rule.id, e.target.value)}
                          placeholder={`Write the statutory rule, provisions, filing frequency, and mandatory compliance requirements for ${rule.actName}...`}
                        />

                        {/* Hidden file input for attaching document */}
                        <input
                          id={`act-rule-file-${rule.id}`}
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileSelect(rule.id, e)}
                        />

                        {/* Attachment button or attached file preview just below Rule Description box */}
                        {rule.attachment && rule.attachment.fileData ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            marginTop: '0.5rem',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '8px',
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              <Paperclip size={15} color="#059669" style={{ flexShrink: 0 }} />
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }} title={rule.attachment.fileName}>
                                  {rule.attachment.fileName}
                                </span>
                                {rule.attachment.fileSize ? (
                                  <span style={{ fontSize: '0.65rem', color: '#059669' }}>
                                    {formatFileSize(rule.attachment.fileSize)}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => downloadActRuleAttachment(rule.attachment)}
                                title="Download Attached File"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                  padding: '0.2rem 0.5rem', borderRadius: '5px',
                                  background: '#DCFCE7', border: '1px solid #86EFAC',
                                  color: '#166534', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer'
                                }}
                              >
                                <Download size={12} /> Download
                              </button>
                              <button
                                type="button"
                                onClick={() => document.getElementById(`act-rule-file-${rule.id}`)?.click()}
                                title="Change Attached File"
                                style={{
                                  padding: '0.2rem 0.5rem', borderRadius: '5px',
                                  background: '#FFFFFF', border: '1px solid #CBD5E1',
                                  color: '#475569', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
                                }}
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(rule.id)}
                                title="Remove Attachment"
                                style={{
                                  padding: '0.2rem 0.4rem', borderRadius: '5px',
                                  background: '#FEE2E2', border: '1px solid #FECACA',
                                  color: '#DC2626', fontSize: '0.7rem', cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => document.getElementById(`act-rule-file-${rule.id}`)?.click()}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '7px',
                                border: '1px dashed #94A3B8',
                                background: '#F8FAFC',
                                color: '#475569',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#1565C0';
                                e.currentTarget.style.color = '#1565C0';
                                e.currentTarget.style.background = '#EFF6FF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#94A3B8';
                                e.currentTarget.style.color = '#475569';
                                e.currentTarget.style.background = '#F8FAFC';
                              }}
                              title="Attach PDF, Image, Excel, or reference document for this Act"
                            >
                              <Paperclip size={13} />
                              <span>Attach File (PDF, Image, Excel)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Row Save Button & Timestamp */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                          {rule.updatedAt ? `Last saved: ${new Date(rule.updatedAt).toLocaleDateString()}` : 'Reference baseline'}
                        </div>

                        <button
                          onClick={() => handleSaveSingle(rule)}
                          disabled={isRowSaving}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.4rem 0.85rem', borderRadius: '7px',
                            background: isRowJustSaved ? '#ECFDF5' : '#EFF6FF',
                            color: isRowJustSaved ? '#047857' : '#1565C0',
                            border: `1px solid ${isRowJustSaved ? '#A7F3D0' : '#BFDBFE'}`,
                            fontSize: '0.75rem', fontWeight: 700, cursor: isRowSaving ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isRowSaving ? (
                            <span>Saving...</span>
                          ) : isRowJustSaved ? (
                            <>
                              <Check size={13} />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <Save size={13} />
                              <span>Save Rule</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ADD CUSTOM ACT MODAL */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(11, 31, 58, 0.55)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', maxWidth: '540px', width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFCFF'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0B1F3A' }}>
                Add Custom Statutory Act
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Act Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Employee State Insurance Act, 1948"
                  value={newActForm.actName}
                  onChange={e => setNewActForm({ ...newActForm, actName: e.target.value })}
                  style={{
                    width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '0.8375rem', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    Short Name / Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ESI Act"
                    value={newActForm.shortName}
                    onChange={e => setNewActForm({ ...newActForm, shortName: e.target.value })}
                    style={{
                      width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px',
                      border: '1px solid #CBD5E1', fontSize: '0.8375rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    Category Domain
                  </label>
                  <select
                    value={newActForm.category}
                    onChange={e => setNewActForm({ ...newActForm, category: e.target.value })}
                    style={{
                      width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px',
                      border: '1px solid #CBD5E1', fontSize: '0.8375rem', outline: 'none', background: 'white'
                    }}
                  >
                    <option value="Labour & Employment Regulations">Labour & Employment</option>
                    <option value="Social Security & Welfare">Social Security & Welfare</option>
                    <option value="Wages & Remuneration">Wages & Remuneration</option>
                    <option value="Establishment & Working Conditions">Establishment & Working Conditions</option>
                    <option value="Workplace Safety & Health">Workplace Safety & Health</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Covered States (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. All States, Maharashtra, Haryana"
                  value={newActForm.states}
                  onChange={e => setNewActForm({ ...newActForm, states: e.target.value })}
                  style={{
                    width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '0.8375rem', outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.775rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Rule Description
                </label>
                <textarea
                  placeholder="Enter the statutory rule and compliance guidelines for this Act..."
                  value={newActForm.description}
                  onChange={e => setNewActForm({ ...newActForm, description: e.target.value })}
                  style={{
                    width: '100%', minHeight: '80px', padding: '0.55rem 0.85rem', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '0.8375rem', outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                    background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNewAct}
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
                    background: '#1565C0', color: 'white', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer'
                  }}
                >
                  Add Act
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};
