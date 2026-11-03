import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { getAdminSidebarItems } from '../utils/adminNavigation';
import {
  Users, CheckCircle2, Trash2, Plus, Loader2,
  MessageSquareQuote, Building2, Calendar, AlertCircle,
  FileCheck, Check, Sparkles, HelpCircle, FileText,
  Paperclip, ExternalLink
} from 'lucide-react';
import { getAdminAudits, saveInterviewResources } from '../services/api';
import type { InterviewResource, QuestionAnswerItem } from '../types/compliance';

export const AdminInterview: React.FC = () => {
  const sidebarItems = getAdminSidebarItems('Interview');

  const [audits, setAudits] = useState<any[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);
  const [interviewResources, setInterviewResources] = useState<InterviewResource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [savedQuestionResourceIds, setSavedQuestionResourceIds] = useState<Set<string>>(new Set());

  const [isLoadingAudits, setIsLoadingAudits] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch all admin audits on mount
  const fetchAudits = async (preferredAuditId?: string) => {
    try {
      setIsLoadingAudits(true);
      const res = await getAdminAudits();
      if (res.success && Array.isArray(res.audits) && res.audits.length > 0) {
        setAudits(res.audits);

        // Pick preferred audit if specified, or existing selectedAuditId, or audit with interviewResources, or first audit
        const targetId = preferredAuditId || selectedAuditId;
        let chosen = targetId ? res.audits.find(a => a.id === targetId) : null;
        if (!chosen) {
          // Prefer audit where interviewResources has items or interviewAudit is true
          chosen = res.audits.find(a => (a.interviewResources && a.interviewResources.length > 0) || a.interviewAudit === true) || res.audits[0];
        }
        setSelectedAuditId(chosen.id);
        setSelectedAudit(chosen);
        initResourcesForAudit(chosen);
      } else {
        setAudits([]);
      }
    } catch (err: any) {
      console.error('Failed to load audits for interview:', err);
      showToast('Failed to load audits list', 'error');
    } finally {
      setIsLoadingAudits(false);
    }
  };

  useEffect(() => {
    fetchAudits();

    // Instant cross-tab sync via BroadcastChannel and Storage event
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('compliance_interview_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'ANSWER_SAVED') {
          if (event.data.resourceId) {
            setInterviewResources(prev => prev.map(r => {
              if (r.id === event.data.resourceId || (r.loginId && r.loginId === event.data.resourceId)) {
                return {
                  ...r,
                  answer: event.data.answer !== undefined ? event.data.answer : (event.data.questions?.[0]?.answer ?? r.answer),
                  questions: event.data.questions || r.questions,
                  status: 'In Progress'
                };
              }
              return r;
            }));
          }
          fetchAudits(selectedAuditId);
        }
      };
    } catch (e) {
      // ignore
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'interview_last_updated') {
        fetchAudits(selectedAuditId);
      }
    };
    window.addEventListener('storage', handleStorage);

    // Auto-sync polling every 10 seconds when tab is actively visible (safety net for cross-device updates)
    const interval = setInterval(() => {
      if (!isSaving && document.visibilityState === 'visible') {
        getAdminAudits().then(res => {
          if (res.success && Array.isArray(res.audits)) {
            setAudits(res.audits);
            setSelectedAudit((prev: any) => {
              if (!prev) return prev;
              const fresh = res.audits.find((a: any) => a.id === prev.id);
              if (fresh && JSON.stringify(fresh.interviewResources) !== JSON.stringify(prev.interviewResources)) {
                initResourcesForAudit(fresh);
                return fresh;
              }
              return prev;
            });
          }
        }).catch(() => { });
      }
    }, 10000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchAudits(selectedAuditId);
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [isSaving, selectedAuditId, selectedAudit?.id]);

  // Initialize resources when audit is selected: REAL AUDITOR DATA ONLY (No dummy data)
  const initResourcesForAudit = (audit: any) => {
    if (!audit) {
      setInterviewResources([]);
      setSavedQuestionResourceIds(new Set());
      setSelectedResourceId(null);
      return;
    }

    let sourceResources: any[] = Array.isArray(audit.interviewResources) ? audit.interviewResources : [];

    // If Re-Audit has no interview resources, fallback to parent audit resources if available
    if (sourceResources.length === 0 && Array.isArray(audits)) {
      const parentAudit = audits.find(a =>
        a.id !== audit.id && (
          a.id === audit.parentAuditId ||
          a.id === audit.originalAuditId ||
          audit.parentAuditId === a.id ||
          (audit.auditIdString && a.auditIdString && audit.auditIdString.replace(/-RA\d*$/, '') === a.auditIdString.replace(/-RA\d*$/, ''))
        ) && Array.isArray(a.interviewResources) && a.interviewResources.length > 0
      );
      if (parentAudit) {
        sourceResources = parentAudit.interviewResources;
      }
    }

    if (sourceResources.length > 0) {
      setInterviewResources(prev => {
        const prevMap = new Map(prev.map(r => [r.id, r]));
        return sourceResources.map((incoming: any) => {
          const ex = prevMap.get(incoming.id);
          // Also look for answers across other audits in memory (e.g. parent audit or re-audit)
          const allOtherRes = (audits || []).flatMap(a => a.interviewResources || []).find((rr: any) =>
            (rr.id && rr.id === incoming.id) || (rr.loginId && rr.loginId === incoming.loginId)
          );

          const mergedQuestions = (incoming.questions || []).map((iq: any, idx: number) => {
            const exQ: any = (ex?.questions && ex.questions[idx]) || {};
            const otherQ: any = (allOtherRes?.questions && allOtherRes.questions[idx]) || {};
            return {
              ...iq,
              answer: iq.answer || exQ.answer || otherQ.answer || '',
              attachmentName: iq.attachmentName || exQ.attachmentName || otherQ.attachmentName || '',
              attachmentData: iq.attachmentData || exQ.attachmentData || otherQ.attachmentData || '',
              attachmentType: iq.attachmentType || exQ.attachmentType || otherQ.attachmentType || '',
              attachmentSize: iq.attachmentSize || exQ.attachmentSize || otherQ.attachmentSize || 0
            };
          });

          const finalAnswer = incoming.answer || ex?.answer || allOtherRes?.answer || mergedQuestions[0]?.answer || '';

          return {
            ...incoming,
            answer: finalAnswer,
            questions: mergedQuestions.length > 0 ? mergedQuestions : incoming.questions
          };
        });
      });
      // Mark resources that already have questions saved
      const savedIds = new Set<string>();
      sourceResources.forEach((r: any) => {
        if (r.isQuestionSaved || (r.question && r.question.trim().length > 0)) {
          savedIds.add(r.id);
        }
      });
      setSavedQuestionResourceIds(savedIds);

      setSelectedResourceId(prevId => {
        if (prevId && sourceResources.some((r: any) => r.id === prevId)) {
          return prevId;
        }
        return sourceResources[0].id;
      });
    } else {
      // Real data only: empty list when auditor has not yet added resources
      setInterviewResources([]);
      setSavedQuestionResourceIds(new Set());
      setSelectedResourceId(null);
    }
  };

  const handleAuditSelect = async (auditId: string) => {
    setSelectedAuditId(auditId);
    const target = audits.find(a => a.id === auditId);
    if (target) {
      setSelectedAudit(target);
      initResourcesForAudit(target);
    }
    // Also fetch latest live audit data from server in case the auditor just saved resources
    try {
      const res = await getAdminAudits();
      if (res.success && Array.isArray(res.audits)) {
        setAudits(res.audits);
        const fresh = res.audits.find(a => a.id === auditId);
        if (fresh) {
          setSelectedAudit(fresh);
          initResourcesForAudit(fresh);
        }
      }
    } catch (e) {
      // fallback
    }
  };

  const handleAddResourceRow = () => {
    const newId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRow: InterviewResource = {
      id: newId,
      name: '',
      preDate: '',
      finalDate: '',
      ask: '',
      status: 'Scheduled',
      question: '',
      answer: ''
    };
    setInterviewResources(prev => [...prev, newRow]);
    setSelectedResourceId(newId);
    setSavedSuccess(false);
  };

  const handleResourceChange = (id: string, field: keyof InterviewResource, val: string) => {
    setInterviewResources(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: val };
        // If ask was updated and question was empty, keep question in sync as a convenience
        if (field === 'ask' && !r.question) {
          updated.question = val;
        }
        return updated;
      }
      return r;
    }));
    setSavedSuccess(false);
  };

  const handleDeleteResourceRow = (id: string) => {
    setInterviewResources(prev => {
      const filtered = prev.filter(r => r.id !== id);
      if (selectedResourceId === id) {
        setSelectedResourceId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    setSavedSuccess(false);
  };

  // Helper to ensure resource has valid questions list
  const getResourceQuestions = (r: InterviewResource | null): QuestionAnswerItem[] => {
    if (!r) return [];
    if (Array.isArray(r.questions) && r.questions.length > 0) {
      return r.questions;
    }
    return [{ id: 'qa_1', question: r.question || '', answer: r.answer || '' }];
  };

  const handleQuestionItemChange = (qaId: string, val: string) => {
    if (!selectedResourceId) return;
    setInterviewResources(prev => prev.map(r => {
      if (r.id === selectedResourceId) {
        const currentList = getResourceQuestions(r);
        const updatedList = currentList.map(q => q.id === qaId ? { ...q, question: val } : q);
        return {
          ...r,
          questions: updatedList,
          question: updatedList[0]?.question || val,
          ask: r.ask || updatedList[0]?.question || val
        };
      }
      return r;
    }));
    setSavedSuccess(false);
  };

  const handleAnswerItemChange = (qaId: string, val: string) => {
    if (!selectedResourceId) return;
    setInterviewResources(prev => prev.map(r => {
      if (r.id === selectedResourceId) {
        const currentList = getResourceQuestions(r);
        const updatedList = currentList.map(q => q.id === qaId ? { ...q, answer: val } : q);
        return {
          ...r,
          questions: updatedList,
          answer: updatedList[0]?.answer || val
        };
      }
      return r;
    }));
    setSavedSuccess(false);
  };

  const handleAddQuestionItem = () => {
    if (!selectedResourceId) return;
    setInterviewResources(prev => prev.map(r => {
      if (r.id === selectedResourceId) {
        const currentList = getResourceQuestions(r);
        const newQa: QuestionAnswerItem = {
          id: `qa_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          question: '',
          answer: ''
        };
        const updatedList = [...currentList, newQa];
        return {
          ...r,
          questions: updatedList
        };
      }
      return r;
    }));
    setSavedSuccess(false);
  };

  const handleRemoveQuestionItem = (qaId: string) => {
    if (!selectedResourceId) return;
    setInterviewResources(prev => prev.map(r => {
      if (r.id === selectedResourceId) {
        const currentList = getResourceQuestions(r);
        if (currentList.length <= 1) return r;
        const updatedList = currentList.filter(q => q.id !== qaId);
        return {
          ...r,
          questions: updatedList,
          question: updatedList[0]?.question || '',
          answer: updatedList[0]?.answer || ''
        };
      }
      return r;
    }));
    setSavedSuccess(false);
  };

  const handleQuestionChange = (val: string) => {
    if (!selectedResourceId) return;
    setInterviewResources(prev => prev.map(r => {
      if (r.id === selectedResourceId) {
        return { ...r, question: val, ask: r.ask || val };
      }
      return r;
    }));
    setSavedSuccess(false);
  };

  const handleAnswerChange = (val: string) => {
    if (!selectedResourceId) return;
    setInterviewResources(prev => prev.map(r => {
      if (r.id === selectedResourceId) {
        return { ...r, answer: val };
      }
      return r;
    }));
    setSavedSuccess(false);
  };

  const handleSaveAll = async () => {
    const targetAuditId = selectedAudit?.id || selectedAuditId;
    if (!targetAuditId) {
      showToast('Please select an audit first', 'error');
      return;
    }
    try {
      setIsSaving(true);
      const emailCandidate = selectedAudit?.auditorEmail;
      const auditorField = (selectedAudit as any)?.auditor;
      const validEmail = (emailCandidate && emailCandidate.includes('@'))
        ? emailCandidate.trim()
        : (auditorField && auditorField.includes('@'))
          ? auditorField.trim()
          : undefined;

      const updatedWithSavedFlag = interviewResources.map(r => {
        if (r.question && r.question.trim().length > 0) {
          return { ...r, isQuestionSaved: true };
        }
        return r;
      });

      const res = await saveInterviewResources(targetAuditId, updatedWithSavedFlag, validEmail, true);
      const updated = res?.data || res?.resources || updatedWithSavedFlag;
      setInterviewResources(updated);
      setSelectedAudit((prev: any) => prev ? { ...prev, interviewResources: updated } : prev);
      setAudits(prev => prev.map(a => a.id === targetAuditId ? { ...a, interviewResources: updated } : a));

      const newSavedIds = new Set<string>();
      updated.forEach((r: any) => {
        if (r.isQuestionSaved || (r.question && r.question.trim().length > 0)) {
          newSavedIds.add(r.id);
        }
      });
      setSavedQuestionResourceIds(newSavedIds);

      setSavedSuccess(true);
      const recipientNotice = res?.recipientEmail ? ` to ${res.recipientEmail}` : '';
      showToast(`Interview resources saved & notification email sent${recipientNotice} successfully!`);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      console.error('Failed to save interview resources:', err);
      showToast(err.response?.data?.error || err.message || 'Failed to save interview resources', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuestion = async () => {
    const targetAuditId = selectedAudit?.id || selectedAuditId;
    if (!targetAuditId) {
      showToast('Please select an audit first', 'error');
      return;
    }
    try {
      setIsSaving(true);
      const emailCandidate = selectedAudit?.auditorEmail;
      const auditorField = (selectedAudit as any)?.auditor;
      const validEmail = (emailCandidate && emailCandidate.includes('@'))
        ? emailCandidate.trim()
        : (auditorField && auditorField.includes('@'))
          ? auditorField.trim()
          : undefined;

      // Mark the selected resource as question-saved so questions become read-only
      const updatedWithSavedFlag = interviewResources.map(r => {
        if (r.id === selectedResourceId) {
          return { ...r, isQuestionSaved: true };
        }
        return r;
      });

      const res = await saveInterviewResources(targetAuditId, updatedWithSavedFlag, validEmail, true);
      const updated = res?.data || res?.resources || updatedWithSavedFlag;
      setInterviewResources(updated);
      setSelectedAudit((prev: any) => prev ? { ...prev, interviewResources: updated } : prev);
      setAudits(prev => prev.map(a => a.id === targetAuditId ? { ...a, interviewResources: updated } : a));

      if (selectedResourceId) {
        setSavedQuestionResourceIds(prev => new Set(prev).add(selectedResourceId));
      }

      setSavedSuccess(true);
      const recipientNotice = res?.recipientEmail ? ` to ${res.recipientEmail}` : '';
      showToast(`Question saved & locked in read-only mode${recipientNotice}!`);
      setTimeout(() => setSavedSuccess(false), 4500);
    } catch (err: any) {
      console.error('Failed to save interview question:', err);
      showToast(err.response?.data?.error || err.message || 'Failed to save question', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Find currently selected resource object
  const currentResource = interviewResources.find(r => r.id === selectedResourceId) || null;

  // Check if current resource's question is in read-only mode (already saved by admin)
  const isQuestionReadOnly = Boolean(
    currentResource && (
      currentResource.isQuestionSaved === true ||
      savedQuestionResourceIds.has(currentResource.id) ||
      (currentResource.question && currentResource.question.trim().length > 0 && selectedAudit?.interviewResources?.some((r: any) => r.id === currentResource.id && (r.isQuestionSaved || (r.question && r.question.trim().length > 0))))
    )
  );

  return (
    <DashboardLayout title="Admin Portal - Interview Management" sidebarItems={sidebarItems}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .interview-table input:focus, .interview-table select:focus, .qa-field textarea:focus {
          border-color: #1565C0 !important;
          box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.12) !important;
        }
        .resource-row-selected {
          background-color: #EFF6FF !important;
        }
        .resource-row-hover:hover {
          background-color: #F8FAFC;
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

        {/* HEADER SECTION */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.2rem 0.65rem', borderRadius: '999px',
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              color: '#1565C0', fontSize: '0.75rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem'
            }}>
              <MessageSquareQuote size={13} /> Interview & Resource Governance
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B1F3A', margin: 0, letterSpacing: '-0.02em' }}>
              Interview Management
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.25rem', margin: 0 }}>
              Track interview resources, schedule dates, assign statutory interview questions, and record verified answers.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleSaveAll}
              disabled={isSaving || !selectedAudit}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none',
                background: '#1565C0', color: '#FFFFFF', fontSize: '0.8125rem', fontWeight: 700,
                cursor: isSaving || !selectedAudit ? 'not-allowed' : 'pointer',
                opacity: isSaving || !selectedAudit ? 0.7 : 1,
                boxShadow: '0 2px 6px rgba(21, 101, 192, 0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => !isSaving && (e.currentTarget.style.backgroundColor = '#0D47A1')}
              onMouseLeave={e => !isSaving && (e.currentTarget.style.backgroundColor = '#1565C0')}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {isSaving ? 'Saving Changes...' : 'Save All Changes'}
            </button>
          </div>
        </div>

        {/* AUDIT SELECTOR CARD */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 3px rgba(11, 31, 58, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 320px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1565C0', flexShrink: 0
            }}>
              <FileCheck size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                Select Audit to Manage Interview Resources
              </label>
              {isLoadingAudits ? (
                <div style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 size={14} className="animate-spin" /> Loading audits...
                </div>
              ) : audits.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#64748B' }}>No audits found</div>
              ) : (
                <select
                  value={selectedAuditId}
                  onChange={e => handleAuditSelect(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '560px',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0F172A',
                    backgroundColor: '#FAFCFF',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {audits.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.vendorName || 'Vendor'} — {a.customerName || 'Customer'} ({a.auditPeriod || 'Period'}) [{a.auditIdString || a.id.substring(0, 8)}]
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {selectedAudit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '6px',
                backgroundColor: selectedAudit.status === 'Completed' || selectedAudit.status === 'Closed' ? '#ECFDF5' : '#EFF6FF',
                color: selectedAudit.status === 'Completed' || selectedAudit.status === 'Closed' ? '#047857' : '#1D4ED8',
                border: `1px solid ${selectedAudit.status === 'Completed' || selectedAudit.status === 'Closed' ? '#A7F3D0' : '#BFDBFE'}`
              }}>
                Status: {selectedAudit.status || 'Scheduled'}
              </span>

              <span style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '6px',
                backgroundColor: selectedAudit.interviewAudit === true ? '#F0FDF4' : '#F1F5F9',
                color: selectedAudit.interviewAudit === true ? '#166534' : '#64748B',
                border: `1px solid ${selectedAudit.interviewAudit === true ? '#BBF7D0' : '#CBD5E1'}`
              }}>
                Interview Audit: {selectedAudit.interviewAudit === true ? 'Enabled' : 'Disabled'}
              </span>

              <span style={{ fontSize: '0.7875rem', color: '#64748B', fontWeight: 600 }}>
                {interviewResources.length} {interviewResources.length === 1 ? 'Resource' : 'Resources'}
              </span>
            </div>
          )}
        </div>

        {/* SCREENSHOT 2 EXACT COMPONENT: ADD RESOURCES (INTERVIEW AUDIT) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Header section from Screenshot 2 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}>
                <Users style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Add Resources
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    backgroundColor: '#DBEAFE',
                    color: '#1D4ED8',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    border: '1px solid #BFDBFE'
                  }}>
                    Interview Audit
                  </span>
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                  Track employee interview schedules, interview dates, questions/tasks asked, and compliance status.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {savedSuccess && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 style={{ width: '14px', height: '14px' }} /> Saved
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving || !selectedAudit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.85rem',
                  backgroundColor: '#1565C0',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  cursor: isSaving || !selectedAudit ? 'not-allowed' : 'pointer',
                  opacity: isSaving || !selectedAudit ? 0.7 : 1,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(21, 101, 192, 0.2)'
                }}
                onMouseEnter={e => !isSaving && (e.currentTarget.style.backgroundColor = '#0D47A1')}
                onMouseLeave={e => !isSaving && (e.currentTarget.style.backgroundColor = '#1565C0')}
              >
                {isSaving ? <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : null}
                {isSaving ? 'Saving...' : 'Save Resources'}
              </button>
            </div>
          </div>

          {/* Resources Table from Screenshot 2: Select, Name, Pre Date, Final Date, Ask, Status, Actions */}
          <div className="interview-table" style={{ overflowX: 'auto', border: '1px solid #CBD5E1', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', width: '70px', textAlign: 'center' }} title="Select row to view/edit Question & Answer">Select</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '160px' }}>Name</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '135px' }}>Pre Date</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '135px' }}>Final Date</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '180px' }}>Ask</th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 700, color: '#334155', minWidth: '130px' }}>Status</th>
                  <th style={{ padding: '0.625rem 0.75rem', width: '40px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {interviewResources.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#334155' }}>
                        No interview resources saved by the auditor yet
                      </p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.7875rem', color: '#64748B' }}>
                        When the auditor enters resources in the Auditor Portal and clicks <strong>Save Resources</strong>, the real data will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  interviewResources.map((row, index) => {
                    const isRowSelected = row.id === selectedResourceId;
                    return (
                      <tr
                        key={row.id || index}
                        className={`resource-row-hover ${isRowSelected ? 'resource-row-selected' : ''}`}
                        onClick={() => setSelectedResourceId(row.id)}
                        style={{
                          borderBottom: index < interviewResources.length - 1 ? '1px solid #F1F5F9' : 'none',
                          cursor: 'pointer',
                          transition: 'background-color 0.12s ease'
                        }}
                      >
                        {/* Select radio button / indicator */}
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          <input
                            type="radio"
                            name="selectedResourceRadio"
                            checked={isRowSelected}
                            onChange={() => setSelectedResourceId(row.id)}
                            title="Select this resource to edit Question and Answer below"
                            style={{ cursor: 'pointer', accentColor: '#1565C0', width: '16px', height: '16px' }}
                          />
                        </td>

                        {/* Name */}
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <input
                            type="text"
                            value={row.name}
                            onChange={e => handleResourceChange(row.id, 'name', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            placeholder="e.g. Employee Name"
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.6rem',
                              fontSize: '0.8125rem',
                              borderRadius: '6px',
                              border: isRowSelected ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </td>

                        {/* Pre Date */}
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <input
                            type="date"
                            value={row.preDate}
                            onChange={e => handleResourceChange(row.id, 'preDate', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.5rem',
                              fontSize: '0.8125rem',
                              borderRadius: '6px',
                              border: isRowSelected ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </td>

                        {/* Final Date */}
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <input
                            type="date"
                            value={row.finalDate}
                            onChange={e => handleResourceChange(row.id, 'finalDate', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.5rem',
                              fontSize: '0.8125rem',
                              borderRadius: '6px',
                              border: isRowSelected ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </td>

                        {/* Ask */}
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <input
                            type="text"
                            value={row.ask}
                            onChange={e => handleResourceChange(row.id, 'ask', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            placeholder="Questions / queries asked"
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.6rem',
                              fontSize: '0.8125rem',
                              borderRadius: '6px',
                              border: isRowSelected ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </td>

                        {/* Status */}
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <select
                            value={row.status || 'Initiate'}
                            onChange={e => handleResourceChange(row.id, 'status', e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.5rem',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: isRowSelected ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: row.status === 'Initiate' ? '#1D4ED8'
                                : row.status === 'Completed' || row.status === 'Compliant' ? '#047857'
                                  : row.status === 'Non-Compliant' ? '#B91C1C'
                                    : row.status === 'In Progress' ? '#2563EB'
                                      : '#475569',
                              outline: 'none',
                              cursor: 'pointer',
                              boxSizing: 'border-box'
                            }}
                          >
                            <option value="Initiate">Initiate</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Compliant">Compliant</option>
                            <option value="Non-Compliant">Non-Compliant</option>
                          </select>
                        </td>

                        {/* Delete Action */}
                        <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteResourceRow(row.id);
                            }}
                            title="Remove resource row"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.15s ease'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
                          >
                            <Trash2 style={{ width: '15px', height: '15px' }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom helper text (Resource addition is managed by the auditor) */}
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              💡 Click on any resource row or the radio button above to edit its Question and Answer below.
            </span>
          </div>
        </div>

        {/* QUESTION AND ANSWER SECTION: 2 FIELDS (LEFT: "QUESTION", RIGHT: "ANSWER") */}
        {currentResource ? (
          <div className="qa-field" style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #BFDBFE',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
            animation: 'fadeIn 0.25s ease'
          }}>
            {/* Header for Question & Answer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid #E2E8F0',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#1D4ED8'
                }}>
                  <MessageSquareQuote size={17} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Interview Details for:
                    <span style={{ color: '#1565C0', textDecoration: 'underline' }}>
                      {currentResource.name.trim() ? currentResource.name : `Resource #${interviewResources.findIndex(r => r.id === currentResource.id) + 1}`}
                    </span>
                  </h4>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                    Enter statutory interview questions and candidate answers for this selected resource.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveQuestion}
                disabled={isSaving || !selectedAudit || isQuestionReadOnly}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '0.35rem 0.75rem', borderRadius: '6px',
                  border: isQuestionReadOnly ? '1px solid #86EFAC' : '1px solid #1565C0',
                  background: isQuestionReadOnly ? '#F0FDF4' : '#EFF6FF',
                  color: isQuestionReadOnly ? '#166534' : '#1565C0',
                  fontSize: '0.75rem', fontWeight: 700,
                  cursor: isSaving || !selectedAudit || isQuestionReadOnly ? 'default' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => !isSaving && !isQuestionReadOnly && (e.currentTarget.style.backgroundColor = '#DBEAFE')}
                onMouseLeave={e => !isSaving && !isQuestionReadOnly && (e.currentTarget.style.backgroundColor = '#EFF6FF')}
              >
                {isSaving ? (
                  <Loader2 style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />
                ) : isQuestionReadOnly ? (
                  <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                ) : (
                  <Check size={14} />
                )}
                {isQuestionReadOnly ? 'Question Saved' : 'Save Question'}
              </button>
            </div>

            {/* Dynamic Question & Answer pairs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {getResourceQuestions(currentResource).map((qaItem, qIdx, allQa) => (
                <div
                  key={qaItem.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '1.25rem',
                    padding: allQa.length > 1 ? '1rem' : '0',
                    backgroundColor: allQa.length > 1 ? '#F8FAFC' : 'transparent',
                    border: allQa.length > 1 ? '1px solid #E2E8F0' : 'none',
                    borderRadius: '8px'
                  }}
                >
                  {/* LEFT FIELD: QUESTION */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <label
                        htmlFor={`interview-question-${qaItem.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: '#0F172A'
                        }}
                      >
                        <HelpCircle size={15} style={{ color: '#2563EB' }} />
                        Question {allQa.length > 1 ? `#${qIdx + 1}` : ''}
                      </label>
                      {isQuestionReadOnly ? (
                        <span style={{ fontSize: '0.7rem', color: '#1565C0', fontWeight: 700, backgroundColor: '#EFF6FF', padding: '1px 6px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                          ✓ Saved (Read Only)
                        </span>
                      ) : (
                        allQa.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionItem(qaItem.id)}
                            title="Remove this question"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'transparent',
                              border: 'none',
                              color: '#EF4444',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        )
                      )}
                    </div>
                    <textarea
                      id={`interview-question-${qaItem.id}`}
                      rows={4}
                      value={qaItem.question || ''}
                      onChange={e => !isQuestionReadOnly && handleQuestionItemChange(qaItem.id, e.target.value)}
                      readOnly={isQuestionReadOnly}
                      placeholder={isQuestionReadOnly ? 'No question specified' : `Enter statutory interview question #${qIdx + 1} asked to this candidate...`}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.8375rem',
                        lineHeight: '1.5',
                        color: '#1E293B',
                        backgroundColor: isQuestionReadOnly ? '#F8FAFC' : '#FAFCFF',
                        outline: 'none',
                        resize: isQuestionReadOnly ? 'none' : 'vertical',
                        cursor: isQuestionReadOnly ? 'default' : 'text',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease'
                      }}
                    />
                    <span style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                      {isQuestionReadOnly
                        ? 'Statutory interview question saved by admin (Read-only).'
                        : 'Statutory interview question asked to this candidate.'}
                    </span>

                    {/* + Button below Question field/box to add more questions (only shown when not read-only) */}
                    {!isQuestionReadOnly && qIdx === allQa.length - 1 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={handleAddQuestionItem}
                          title="Add another question for this candidate"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.45rem 0.95rem',
                            backgroundColor: '#EFF6FF',
                            color: '#1565C0',
                            border: '1.5px dashed #60A5FA',
                            borderRadius: '8px',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#DBEAFE';
                            e.currentTarget.style.borderColor = '#1D4ED8';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = '#EFF6FF';
                            e.currentTarget.style.borderColor = '#60A5FA';
                          }}
                        >
                          <Plus size={16} /> Add Question
                        </button>
                      </div>
                    )}
                  </div>

                  {/* RIGHT FIELD: ANSWER (Real data only, no dummy text) */}
                  <div>
                    {(() => {
                      const itemAnswer = qaItem.answer || (qIdx === 0 ? currentResource?.answer : '') || '';
                      const itemAttachmentName = qaItem.attachmentName || (qIdx === 0 ? (currentResource as any)?.attachmentName : '') || '';
                      const itemAttachmentData = qaItem.attachmentData || (qIdx === 0 ? (currentResource as any)?.attachmentData : '') || '';
                      const itemAttachmentSize = qaItem.attachmentSize || (qIdx === 0 ? (currentResource as any)?.attachmentSize : 0) || 0;

                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <label
                              htmlFor={`interview-answer-${qaItem.id}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                color: '#0F172A'
                              }}
                            >
                              <FileText size={15} style={{ color: '#059669' }} />
                              Answer {allQa.length > 1 ? `#${qIdx + 1}` : ''}
                            </label>
                            {itemAnswer && itemAnswer.trim().length > 0 && (
                              <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, backgroundColor: '#ECFDF5', padding: '1px 6px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                                ✓ Auditor Verified
                              </span>
                            )}
                          </div>
                          <textarea
                            id={`interview-answer-${qaItem.id}`}
                            rows={4}
                            value={itemAnswer}
                            readOnly={true}
                            placeholder="Candidate / auditor response will appear here once submitted..."
                            style={{
                              width: '100%',
                              padding: '0.75rem 0.85rem',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                              fontSize: '0.8375rem',
                              lineHeight: '1.5',
                              color: '#1E293B',
                              backgroundColor: '#F8FAFC',
                              outline: 'none',
                              resize: 'none',
                              cursor: 'default',
                              boxSizing: 'border-box',
                              fontFamily: 'inherit'
                            }}
                          />

                          {/* ATTACHMENT CARD FOR ADMIN (Below Answer Box) */}
                          {itemAttachmentName ? (
                            <div style={{
                              marginTop: '0.625rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.55rem 0.75rem',
                              backgroundColor: '#EFF6FF',
                              border: '1.5px solid #BFDBFE',
                              borderRadius: '8px',
                              gap: '0.5rem',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                <div style={{
                                  width: '26px', height: '26px', borderRadius: '6px',
                                  backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', color: '#1D4ED8', flexShrink: 0
                                }}>
                                  <Paperclip size={14} />
                                </div>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <div style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: '#1E293B',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap'
                                  }} title={itemAttachmentName}>
                                    {itemAttachmentName}
                                  </div>
                                  {itemAttachmentSize ? (
                                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                      {formatFileSize(itemAttachmentSize)}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <a
                                href={itemAttachmentData}
                                download={itemAttachmentName}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '0.28rem 0.65rem',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #1D4ED8',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#1D4ED8',
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  transition: 'all 0.15s ease'
                                }}
                                title="Open or download attachment uploaded by auditor/candidate"
                              >
                                <ExternalLink size={12} /> Open Attachment
                              </a>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                              Candidate's verified statement, employee response, or auditor verification findings.
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px dashed #CBD5E1',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            color: '#64748B'
          }}>
            <MessageSquareQuote size={32} style={{ margin: '0 auto 0.75rem', color: '#94A3B8' }} />
            <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
              No Resource Selected
            </h4>
            <p style={{ margin: 0, fontSize: '0.8125rem' }}>
              Please add or select a resource row in the table above to view and enter its <strong>Question</strong> and <strong>Answer</strong>.
            </p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
