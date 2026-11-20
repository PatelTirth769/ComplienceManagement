import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Lock, User, HelpCircle, CheckCircle2,
  AlertCircle, ArrowRight, Loader2, LogOut, FileText,
  RefreshCw, Paperclip, ExternalLink, Trash2,
  Camera, Eye, AlertTriangle, Sparkles
} from 'lucide-react';
import { interviewLogin, submitInterviewAnswer, getInterviewSession } from '../services/api';
import type { InterviewResource, QuestionAnswerItem, InterviewProctoringResult } from '../types/compliance';

export const InterviewLogin: React.FC = () => {
  // Login Form States
  const [loginId, setLoginId] = useState('');
  const [pass, setPass] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authenticated Session States (using tab-isolated sessionStorage so each new window or tab requires fresh login)
  const [sessionResource, setSessionResource] = useState<InterviewResource | null>(() => {
    try {
      // Purge any stale legacy session from localStorage
      localStorage.removeItem('interview_session_resource');
      localStorage.removeItem('interview_session_audit');
      const saved = sessionStorage.getItem('interview_session_resource');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [sessionAudit, setSessionAudit] = useState<any | null>(() => {
    try {
      const saved = sessionStorage.getItem('interview_session_audit');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Multiple Answers State: Map of question id -> answer string
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [answerSuccess, setAnswerSuccess] = useState(false);
  const [isCompletedAndClosed, setIsCompletedAndClosed] = useState(false);

  // AI Proctoring States (Client-Side, 100% Free, Zero Cloud Cost)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const missStreakRef = useRef<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<'detected' | 'not_detected' | 'multiple_detected' | 'checking'>('checking');
  const [proctoringNotice, setProctoringNotice] = useState<string | null>(null);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [proctoringViolations, setProctoringViolations] = useState({
    faceMissingCount: 0,
    multipleFacesCount: 0,
    tabSwitchesCount: 0
  });

  // Refreshing session
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to calculate AI integrity score (starts at 100%, penalties for leaving tab or leaving camera view)
  const calculateIntegrityScore = (violations: { faceMissingCount: number; multipleFacesCount: number; tabSwitchesCount: number }) => {
    const penalty = (violations.tabSwitchesCount * 15) + (violations.faceMissingCount * 10) + (violations.multipleFacesCount * 25);
    return Math.max(0, Math.min(100, 100 - penalty));
  };

  const getIntegrityStatus = (score: number): 'Verified Clean' | 'Review Needed' | 'Flagged' => {
    if (score >= 85) return 'Verified Clean';
    if (score >= 65) return 'Review Needed';
    return 'Flagged';
  };

  // Camera stream & Tab focus monitoring lifecycle
  useEffect(() => {
    if (!sessionResource || isCompletedAndClosed) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraActive(false);
      }
      return;
    }

    let isMounted = true;
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Camera access not supported on this browser.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 400 }, height: { ideal: 300 }, facingMode: 'user' },
          audio: false
        });
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
        // Ensure stream is attached even if video element finishes mounting in next tick
        setTimeout(() => {
          if (videoRef.current && videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => { });
          }
        }, 150);
        setCameraActive(true);
        setCameraError(null);
      } catch (err: any) {
        console.warn('Camera permission denied or not found:', err.message);
        setCameraError('Please allow camera access for AI statutory interview verification.');
      }
    };

    startCamera();

    // Tab visibility change detection (Detects if candidate switches away to another browser tab)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setProctoringViolations(prev => ({
          ...prev,
          tabSwitchesCount: prev.tabSwitchesCount + 1
        }));
        setProctoringNotice('⚠️ Tab switch detected! Please stay focused on your interview window.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [sessionResource, isCompletedAndClosed]);

  // Real-Time Browser AI Face & Presence Verification Loop (runs every 2 seconds)
  useEffect(() => {
    if (!sessionResource || !cameraActive || isCompletedAndClosed) return;

    let detector: any = null;
    try {
      if ('FaceDetector' in window) {
        detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      }
    } catch (e) { }

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const handleFaceMissing = () => {
        missStreakRef.current += 1;
        setFaceStatus('not_detected');
        // If not detected for 2 consecutive cycles (~4 seconds), record violation and alert
        if (missStreakRef.current >= 2) {
          setProctoringViolations(prev => ({ ...prev, faceMissingCount: prev.faceMissingCount + 1 }));
          setProctoringNotice('⚠️ Candidate face not detected in camera frame. Please face screen directly.');
        }
      };

      if (detector) {
        try {
          const faces = await detector.detect(video);
          if (faces.length === 0) {
            handleFaceMissing();
          } else if (faces.length > 1) {
            missStreakRef.current = 0;
            setFaceStatus('multiple_detected');
            setProctoringViolations(prev => ({ ...prev, multipleFacesCount: prev.multipleFacesCount + 1 }));
            setProctoringNotice('⚠️ Multiple individuals detected in camera! Only candidate is allowed.');
          } else {
            missStreakRef.current = 0;
            setFaceStatus('detected');
            setProctoringNotice(prev => (prev && prev.includes('Candidate face not detected') ? null : prev));
          }
          return;
        } catch (e) {
          // fallback to canvas analysis
        }
      }

      // Robust Canvas Face & Presence Verification (Accurate across all skin tones, rejects empty rooms & backgrounds)
      try {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, 160, 120);
        const imgData = ctx.getImageData(0, 0, 160, 120);
        const data = imgData.data;

        let totalBrightness = 0;
        let totalSkin = 0;
        let faceZoneSkin = 0;
        let farLeftSkin = 0;
        let farRightSkin = 0;
        let minX = 160, maxX = 0, minY = 120, maxY = 0;
        const faceZoneLuminance: number[] = [];

        // Sample every 2nd pixel in X and Y (80x60 = 4,800 samples)
        const sampleStep = 2;
        let sampleCount = 0;

        for (let y = 0; y < 120; y += sampleStep) {
          for (let x = 0; x < 160; x += sampleStep) {
            sampleCount++;
            const idx = (y * 160 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += lum;

            // Chai-Ngan / Kovac YCbCr Skin Chrominance Model
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
            const isSkin = (
              r > 65 && g > 40 && b > 20 &&
              r > g && r > b && (r - g) >= 12 &&
              cb >= 77 && cb <= 127 &&
              cr >= 133 && cr <= 173
            );

            if (isSkin) {
              totalSkin++;
              if (x < 32) farLeftSkin++;
              if (x > 128) farRightSkin++;

              // Candidate head/face zone: upper-center region of webcam frame
              if (x >= 28 && x <= 132 && y >= 10 && y <= 95) {
                faceZoneSkin++;
                faceZoneLuminance.push(lum);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
        }

        const avgBrightness = totalBrightness / sampleCount;

        // 1. Dark, covered camera or blinding light
        if (avgBrightness < 18 || avgBrightness > 248) {
          handleFaceMissing();
          return;
        }

        // 2. Reject flat wall / solid surface covering screen (>55% of entire frame is uniform color)
        if (totalSkin > sampleCount * 0.55) {
          handleFaceMissing();
          return;
        }

        // 3. Minimum skin pixels required in the candidate face zone (rejects empty room noise)
        if (faceZoneSkin < 80) {
          handleFaceMissing();
          return;
        }

        // 4. Cluster dimensions in face zone must resemble human head proportions
        const clusterWidth = maxX >= minX ? (maxX - minX) : 0;
        const clusterHeight = maxY >= minY ? (maxY - minY) : 0;
        if (clusterWidth < 20 || clusterHeight < 24) {
          handleFaceMissing();
          return;
        }

        const aspectRatio = clusterHeight / clusterWidth;
        if (aspectRatio < 0.55 || aspectRatio > 2.3) {
          handleFaceMissing();
          return;
        }

        // 5. Facial features texture variance (eyes, brows, nose, lips vs flat wooden furniture/wall)
        if (faceZoneLuminance.length >= 40) {
          const mean = faceZoneLuminance.reduce((sum, val) => sum + val, 0) / faceZoneLuminance.length;
          let varianceSum = 0;
          for (let i = 0; i < faceZoneLuminance.length; i++) {
            const diff = faceZoneLuminance[i] - mean;
            varianceSum += diff * diff;
          }
          const stdDev = Math.sqrt(varianceSum / faceZoneLuminance.length);
          if (stdDev < 6.5) {
            // Flat painted surface, uniform furniture, or cardboard - not a human face
            handleFaceMissing();
            return;
          }
        }

        // 6. Check for multiple individuals (skin spread widely across both extremes simultaneously)
        if (farLeftSkin > 65 && farRightSkin > 65 && totalSkin > 450) {
          missStreakRef.current = 0;
          setFaceStatus('multiple_detected');
          setProctoringViolations(prev => ({ ...prev, multipleFacesCount: prev.multipleFacesCount + 1 }));
          setProctoringNotice('⚠️ Multiple individuals detected in camera! Only candidate is allowed.');
          return;
        }

        // Candidate successfully verified in frame
        missStreakRef.current = 0;
        setFaceStatus('detected');
        setProctoringNotice(prev => (prev && prev.includes('Candidate face not detected') ? null : prev));
      } catch (e) {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionResource, cameraActive, isCompletedAndClosed]);

  // Read loginId from URL query param if user clicked a direct candidate link
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryLoginId = urlParams.get('loginId');
      if (queryLoginId) {
        setLoginId(queryLoginId.trim());
        // If query login ID doesn't match the current session, reset to require login for this candidate
        if (sessionResource && sessionResource.loginId && sessionResource.loginId.toLowerCase() !== queryLoginId.trim().toLowerCase()) {
          setSessionResource(null);
          setSessionAudit(null);
          sessionStorage.removeItem('interview_session_resource');
          sessionStorage.removeItem('interview_session_audit');
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Helper to extract questions array
  const getQuestionsList = (res: InterviewResource | null): QuestionAnswerItem[] => {
    if (!res) return [];
    if (Array.isArray(res.questions) && res.questions.length > 0) {
      const validQuestions = res.questions.filter(q => q && q.question && q.question.trim().length > 0);
      if (validQuestions.length > 0) {
        return res.questions;
      }
    }
    if (res.question && res.question.trim().length > 0) {
      return [{ id: 'qa_1', question: res.question, answer: res.answer || '' }];
    }
    if (res.ask && res.ask.trim().length > 0) {
      return [{ id: 'qa_1', question: res.ask, answer: res.answer || '' }];
    }
    return Array.isArray(res.questions) && res.questions.length > 0 ? res.questions : [];
  };

  interface AttachmentInfo {
    name: string;
    data: string;
    type?: string;
    size?: number;
  }
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, AttachmentInfo | null>>({});

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB limit. Please choose a smaller file.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachmentsMap(prev => ({
        ...prev,
        [questionId]: {
          name: file.name,
          data: result,
          type: file.type,
          size: file.size
        }
      }));
    };
    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAttachment = (questionId: string) => {
    setAttachmentsMap(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  // Sync answersMap and attachmentsMap when candidate session resource loads or switches
  const loadedResourceIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (sessionResource && sessionResource.id !== loadedResourceIdRef.current) {
      loadedResourceIdRef.current = sessionResource.id;
      const list = getQuestionsList(sessionResource);
      const initialMap: Record<string, string> = {};
      const initialAttachments: Record<string, AttachmentInfo | null> = {};
      list.forEach(q => {
        initialMap[q.id] = q.answer || '';
        if (q.attachmentName && q.attachmentData) {
          initialAttachments[q.id] = {
            name: q.attachmentName,
            data: q.attachmentData,
            type: q.attachmentType,
            size: q.attachmentSize
          };
        }
      });
      setAnswersMap(initialMap);
      setAttachmentsMap(initialAttachments);
    }
  }, [sessionResource?.id]);

  // Periodic poll to fetch latest Question if admin updates it (without wiping active typing)
  useEffect(() => {
    if (!sessionAudit?.id || !sessionResource?.id) return;

    const pollFreshSession = async () => {
      try {
        const res = await getInterviewSession(sessionAudit.id, sessionResource.id);
        if (res.success && res.resource) {
          const newQuestions = res.resource.questions;
          const newHasQ = (Array.isArray(newQuestions) && newQuestions.some((q: any) => q && q.question && q.question.trim().length > 0)) || (res.resource.question && res.resource.question.trim().length > 0);
          setSessionResource(prev => {
            if (!prev) return res.resource;
            return {
              ...prev,
              ...res.resource,
              question: newHasQ ? (res.resource.question || prev.question) : prev.question,
              questions: newHasQ ? (res.resource.questions || prev.questions) : prev.questions
            };
          });
          sessionStorage.setItem('interview_session_resource', JSON.stringify(res.resource));
        }
      } catch (err) {
        // silent
      }
    };

    const interval = setInterval(pollFreshSession, 12000);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        pollFreshSession();
      }
    };
    window.addEventListener('focus', handleVisible);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisible);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [sessionAudit?.id, sessionResource?.id]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !pass.trim()) {
      setErrorMessage('Please enter both Login ID and Password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const urlParams = new URLSearchParams(window.location.search);
      const queryAuditId = urlParams.get('auditId') || undefined;
      const res = await interviewLogin(loginId.trim(), pass.trim(), queryAuditId);
      if (res.success && res.resource) {
        loadedResourceIdRef.current = res.resource.id;
        setSessionResource(res.resource);
        setSessionAudit(res.audit);
        const list = getQuestionsList(res.resource);
        const initialMap: Record<string, string> = {};
        const initialAttachments: Record<string, AttachmentInfo | null> = {};
        list.forEach(q => {
          initialMap[q.id] = q.answer || '';
          if (q.attachmentName && q.attachmentData) {
            initialAttachments[q.id] = {
              name: q.attachmentName,
              data: q.attachmentData,
              type: q.attachmentType,
              size: q.attachmentSize
            };
          }
        });
        setAnswersMap(initialMap);
        setAttachmentsMap(initialAttachments);
        sessionStorage.setItem('interview_session_resource', JSON.stringify(res.resource));
        sessionStorage.setItem('interview_session_audit', JSON.stringify(res.audit));
      } else {
        setErrorMessage(res.error || 'Invalid credentials. Please verify the Login ID and Password from your email.');
      }
    } catch (err: any) {
      console.error('Interview login error:', err);
      setErrorMessage(err.response?.data?.error || err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!sessionAudit?.id || !sessionResource?.id) return;
    try {
      setIsRefreshing(true);
      const res = await getInterviewSession(sessionAudit.id, sessionResource.id);
      if (res.success && res.resource) {
        setSessionResource(res.resource);
        const list = getQuestionsList(res.resource);
        setAnswersMap(prev => {
          const next = { ...prev };
          list.forEach(q => {
            if (q.answer && !next[q.id]) {
              next[q.id] = q.answer;
            }
          });
          return next;
        });
        localStorage.setItem('interview_session_resource', JSON.stringify(res.resource));
      }
    } catch (err) {
      console.error('Failed to refresh session:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionAudit?.id || !sessionResource?.id) return;
    try {
      setIsSubmittingAnswer(true);
      const list = getQuestionsList(sessionResource);
      const updatedQuestions = list.map(q => {
        const att = attachmentsMap[q.id];
        return {
          ...q,
          answer: answersMap[q.id] !== undefined ? answersMap[q.id] : (q.answer || ''),
          attachmentName: att ? att.name : (q.attachmentName || ''),
          attachmentData: att ? att.data : (q.attachmentData || ''),
          attachmentType: att ? (att.type || q.attachmentType || '') : '',
          attachmentSize: att ? (att.size || q.attachmentSize || 0) : 0
        };
      });

      const finalScore = calculateIntegrityScore(proctoringViolations);
      const finalStatus = getIntegrityStatus(finalScore);
      const finalProctoring: InterviewProctoringResult = {
        integrityScore: finalScore,
        integrityStatus: finalStatus,
        violations: {
          faceMissingCount: proctoringViolations.faceMissingCount,
          multipleFacesCount: proctoringViolations.multipleFacesCount,
          tabSwitchesCount: proctoringViolations.tabSwitchesCount
        },
        durationSeconds: Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000)),
        verifiedAt: new Date().toISOString()
      };

      const res = await submitInterviewAnswer(
        sessionAudit.id,
        sessionResource.id,
        updatedQuestions[0]?.answer || '',
        answersMap,
        updatedQuestions,
        finalProctoring,
        'Completed'
      );

      if (res.success) {
        setAnswerSuccess(true);
        setIsCompletedAndClosed(true);

        // Turn off camera cleanly
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        setCameraActive(false);

        const updatedRes = res.resource || {
          ...sessionResource,
          answer: updatedQuestions[0]?.answer || '',
          questions: updatedQuestions,
          status: 'Completed',
          proctoring: finalProctoring
        };
        setSessionResource(updatedRes);
        sessionStorage.setItem('interview_session_resource', JSON.stringify(updatedRes));

        // Immediately notify open Admin Interview tabs across windows/tabs
        try {
          const bc = new BroadcastChannel('compliance_interview_channel');
          bc.postMessage({
            type: 'ANSWER_SAVED',
            auditId: sessionAudit.id,
            resourceId: sessionResource.id,
            status: 'Completed',
            answer: updatedQuestions[0]?.answer || '',
            questions: updatedQuestions,
            proctoring: finalProctoring
          });
          bc.close();
        } catch (e) {
          // ignore
        }
        localStorage.setItem('interview_last_updated', Date.now().toString());

        // Automatically close this page / window
        const closeThisWindow = () => {
          try {
            window.open('', '_self', '');
            window.close();
          } catch (e) { }
          try {
            window.close();
          } catch (e) { }
          try {
            self.close();
          } catch (e) { }
        };

        // Attempt closing after brief display of save status
        setTimeout(closeThisWindow, 800);
        setTimeout(closeThisWindow, 1500);
      }
    } catch (err: any) {
      console.error('Submit answer error:', err);
      alert('Failed to save answer.');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleLogout = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    sessionStorage.removeItem('interview_session_resource');
    sessionStorage.removeItem('interview_session_audit');
    localStorage.removeItem('interview_session_resource');
    localStorage.removeItem('interview_session_audit');
    setSessionResource(null);
    setSessionAudit(null);
    setLoginId('');
    setPass('');
    setAnswersMap({});
    setAttachmentsMap({});
    setIsCompletedAndClosed(false);
    setErrorMessage(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0F172A'
    }}>
      {/* Top Header */}
      <header style={{
        backgroundColor: '#0B1F3A',
        color: '#FFFFFF',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '3px solid #2563EB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={20} color="#38BDF8" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Compliance Platform</div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>Interview Examination Portal</div>
          </div>
        </div>

        {sessionResource && (
          <button
            onClick={handleLogout}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid #334155',
              backgroundColor: '#1E293B', color: '#E2E8F0', fontSize: '0.75rem', fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} /> Exit Session
          </button>
        )}
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '840px', margin: '2rem auto', padding: '0 1rem' }}>

        {/* 1. LOGIN SCREEN (If not logged in) */}
        {!sessionResource ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            boxShadow: '0 4px 20px rgba(11, 31, 58, 0.06)',
            maxWidth: '460px',
            margin: '2rem auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '12px',
                backgroundColor: '#EFF6FF', border: '1.5px solid #BFDBFE',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#1D4ED8', marginBottom: '0.75rem'
              }}>
                <Lock size={26} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                Interview Portal Login
              </h2>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: '#64748B' }}>
                Enter the Login ID and Password received in your automated email notification.
              </p>
            </div>

            {errorMessage && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '1.25rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Login ID
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                  <input
                    type="text"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    placeholder="e.g. INT-123456"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                  <input
                    type="password"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    placeholder="Enter interview password"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1565C0',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: isLoading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(21, 101, 192, 0.25)',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={e => !isLoading && (e.currentTarget.style.backgroundColor = '#0D47A1')}
                onMouseLeave={e => !isLoading && (e.currentTarget.style.backgroundColor = '#1565C0')}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {isLoading ? 'Verifying Credentials...' : 'Access Interview'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748B' }}>
              Protected statutory interview session. Access credentials are confidential and uniquely generated.
            </div>
          </div>
        ) : (

          /* 2. AUTHENTICATED INTERVIEW QUESTION & SESSION PAGE */
          <div>
            {/* Candidate & Audit Details Top Card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 4px rgba(11, 31, 58, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#1D4ED8', backgroundColor: '#EFF6FF', padding: '0.15rem 0.55rem', borderRadius: '999px', marginBottom: '0.4rem', border: '1px solid #BFDBFE' }}>
                  Candidate Interview Session
                </div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                  {sessionResource.name || 'Candidate Name'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.7875rem', color: '#64748B', flexWrap: 'wrap' }}>
                  <span>Audit: <strong>{sessionAudit?.auditIdString || 'AUDIT'}</strong></span>
                  <span>Vendor: <strong>{sessionAudit?.vendorName || 'N/A'}</strong></span>
                  <span>Schedule: <strong>{sessionResource.preDate || 'N/A'} to {sessionResource.finalDate || 'N/A'}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '6px',
                  backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE'
                }}>
                  Status: {sessionResource.status || 'Initiate'}
                </span>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh latest Question from Admin"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF', color: '#334155', fontSize: '0.75rem', fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* AI VIDEO PROCTORING & INTEGRITY CARD */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #BFDBFE',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.08)',
              background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: '#EFF6FF', border: '1px solid #93C5FD',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#2563EB'
                  }}>
                    <Camera size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      AI Video Proctoring Active
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        padding: '0.15rem 0.55rem',
                        borderRadius: '999px',
                        border: '1px solid #86EFAC',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Sparkles size={11} /> Real-Time Browser AI
                      </span>
                    </h3>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                      Continuous face presence & focus verification. No video recordings are saved on server.
                    </p>
                  </div>
                </div>

                {/* Live Integrity Score Pill */}
                {(() => {
                  const score = calculateIntegrityScore(proctoringViolations);
                  const status = getIntegrityStatus(score);
                  const isClean = status === 'Verified Clean';
                  const isReview = status === 'Review Needed';
                  return (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: isClean ? '#F0FDF4' : isReview ? '#FEFCE8' : '#FEF2F2',
                      border: `1px solid ${isClean ? '#86EFAC' : isReview ? '#FDE047' : '#FCA5A5'}`
                    }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: isClean ? '#16A34A' : isReview ? '#CA8A04' : '#DC2626',
                        boxShadow: `0 0 6px ${isClean ? '#22C55E' : isReview ? '#EAB308' : '#EF4444'}`
                      }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isClean ? '#166534' : isReview ? '#854D0E' : '#991B1B' }}>
                        Integrity Score: {score}% ({status})
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Proctoring Video Feed & Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.25rem',
                alignItems: 'center'
              }}>
                {/* CAMERA FEED DISPLAY */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    position: 'relative',
                    width: '200px',
                    height: '150px',
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '2px solid #3B82F6',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
                  }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)' // Mirror view
                      }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Camera Overlay Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#FFFFFF',
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: cameraActive ? '#22C55E' : '#EF4444',
                        boxShadow: cameraActive ? '0 0 6px #22C55E' : 'none'
                      }} />
                      {cameraActive ? 'LIVE' : 'OFFLINE'}
                    </div>
                  </div>

                  {cameraError && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.725rem',
                      color: '#DC2626',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}>
                      {cameraError}
                    </div>
                  )}
                </div>

                {/* AI VERIFICATION STATUS INDICATORS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* Item 1: Face Presence */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.85rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Eye size={15} style={{ color: '#2563EB' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                        Candidate Presence:
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: faceStatus === 'detected' ? '#166534' : faceStatus === 'multiple_detected' ? '#991B1B' : '#854D0E'
                    }}>
                      {faceStatus === 'detected' ? '✓ Verified in Frame'
                        : faceStatus === 'multiple_detected' ? '⚠️ Extra Person'
                          : faceStatus === 'not_detected' ? '⚠️ Face Not In View'
                            : 'Checking...'}
                    </span>
                  </div>

                  {/* Item 2: Tab & Window Focus */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.85rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={15} style={{ color: '#059669' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                        Browser Focus:
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: proctoringViolations.tabSwitchesCount === 0 ? '#166534' : '#DC2626'
                    }}>
                      {proctoringViolations.tabSwitchesCount === 0
                        ? '✓ Active Window'
                        : `⚠️ ${proctoringViolations.tabSwitchesCount} Tab Switch${proctoringViolations.tabSwitchesCount > 1 ? 'es' : ''}`}
                    </span>
                  </div>

                  {/* Item 3: Privacy Assurance */}
                  <div style={{
                    fontSize: '0.725rem',
                    color: '#64748B',
                    lineHeight: '1.4',
                    backgroundColor: '#F1F5F9',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px'
                  }}>
                    🔒 <strong>Privacy Assurance:</strong> Video analysis is performed locally in your browser. No video recordings are saved, streamed to third parties, or stored on servers.
                  </div>
                </div>
              </div>

              {/* Dynamic Warning Notice */}
              {proctoringNotice && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.55rem 0.85rem',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '6px',
                  color: '#92400E',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={15} style={{ color: '#D97706', flexShrink: 0 }} />
                  <span>{proctoringNotice}</span>
                </div>
              )}
            </div>

            {/* STATUTORY INTERVIEW QUESTIONS & ANSWERS */}
            {getQuestionsList(sessionResource).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {getQuestionsList(sessionResource).map((qaItem, idx, allItems) => (
                  <div
                    key={qaItem.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 2px 8px rgba(11, 31, 58, 0.05)'
                    }}
                  >
                    {/* QUESTION DISPLAY */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#1D4ED8'
                        }}>
                          <HelpCircle size={16} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                          Question {allItems.length > 1 ? `#${idx + 1}` : ''}
                        </h3>
                      </div>
                      <div style={{
                        backgroundColor: '#FAFCFF',
                        border: '1.5px solid #BFDBFE',
                        borderLeft: '5px solid #1D4ED8',
                        borderRadius: '8px',
                        padding: '1rem 1.25rem',
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: '#0F172A',
                        lineHeight: '1.6'
                      }}>
                        {qaItem.question}
                      </div>
                    </div>

                    {/* ANSWER INPUT */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} style={{ color: '#059669' }} />
                          <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                            Candidate / Verified Answer {allItems.length > 1 ? `#${idx + 1}` : ''}
                          </label>
                        </div>
                        {answersMap[qaItem.id] && answersMap[qaItem.id].trim().length > 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, backgroundColor: '#ECFDF5', padding: '1px 6px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={4}
                        value={answersMap[qaItem.id] || ''}
                        onChange={e => setAnswersMap(prev => ({ ...prev, [qaItem.id]: e.target.value }))}
                        placeholder={`Enter the candidate's verified statement or response for Question #${idx + 1}...`}
                        style={{
                          width: '100%',
                          padding: '0.85rem',
                          borderRadius: '8px',
                          border: '1.5px solid #CBD5E1',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          color: '#0F172A',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit'
                        }}
                      />

                      {/* ATTACHMENT SECTION (Below Answer Box) */}
                      <div style={{ marginTop: '0.75rem' }}>
                        <input
                          type="file"
                          id={`file-input-${qaItem.id}`}
                          style={{ display: 'none' }}
                          onChange={e => handleFileUpload(qaItem.id, e)}
                        />

                        {attachmentsMap[qaItem.id] ? (
                          /* Uploaded Attachment Card */
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.55rem 0.85rem',
                            backgroundColor: '#F0FDF4',
                            border: '1.5px solid #86EFAC',
                            borderRadius: '8px',
                            gap: '0.75rem',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '26px', height: '26px', borderRadius: '6px',
                                backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: '#15803D', flexShrink: 0
                              }}>
                                <Paperclip size={14} />
                              </div>
                              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                <div style={{
                                  fontSize: '0.8125rem', fontWeight: 700, color: '#14532D',
                                  textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                                }} title={attachmentsMap[qaItem.id]?.name}>
                                  {attachmentsMap[qaItem.id]?.name}
                                </div>
                                {attachmentsMap[qaItem.id]?.size ? (
                                  <div style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 600 }}>
                                    {formatFileSize(attachmentsMap[qaItem.id]?.size)}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <a
                                href={attachmentsMap[qaItem.id]?.data}
                                download={attachmentsMap[qaItem.id]?.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '0.28rem 0.6rem',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #86EFAC',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#15803D',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                                title="Open or download uploaded file"
                              >
                                <ExternalLink size={12} /> Open
                              </a>

                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(qaItem.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '0.28rem 0.6rem',
                                  backgroundColor: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#DC2626',
                                  cursor: 'pointer'
                                }}
                                title="Remove attachment"
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Attach File Button */
                          <button
                            type="button"
                            onClick={() => document.getElementById(`file-input-${qaItem.id}`)?.click()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '0.4rem 0.85rem',
                              backgroundColor: '#FFFFFF',
                              color: '#1565C0',
                              border: '1.5px dashed #93C5FD',
                              borderRadius: '7px',
                              fontSize: '0.7875rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = '#EFF6FF';
                              e.currentTarget.style.borderColor = '#2563EB';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#93C5FD';
                            }}
                          >
                            <Paperclip size={14} /> Attach File / Evidence
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* SUBMIT BUTTON BAR */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(11, 31, 58, 0.05)'
                }}>
                  <div>
                    {answerSuccess && (
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={17} /> Answer(s) Saved Successfully! Closing window...
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={isSubmittingAnswer}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#1565C0',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: isSubmittingAnswer ? 'wait' : 'pointer',
                      boxShadow: '0 2px 8px rgba(21, 101, 192, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => !isSubmittingAnswer && (e.currentTarget.style.backgroundColor = '#0D47A1')}
                    onMouseLeave={e => !isSubmittingAnswer && (e.currentTarget.style.backgroundColor = '#1565C0')}
                  >
                    {isSubmittingAnswer ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {isSubmittingAnswer ? 'Saving Answers...' : 'Submit / Save Answer'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center',
                color: '#64748B',
                fontSize: '0.875rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#334155' }}>Questions are being prepared</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.7875rem' }}>
                  The Administrator has not saved questions for this candidate yet. Click <strong>Refresh</strong> once the admin saves questions in the Admin Console.
                </p>
              </div>
            )}

          </div>
        )}

      </main>

      {/* COMPLETED SUCCESS OVERLAY */}
      {isCompletedAndClosed && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
            border: '2px solid #86EFAC'
          }}>
            <div style={{
              width: '68px', height: '68px', borderRadius: '50%',
              backgroundColor: '#DCFCE7', color: '#16A34A',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <CheckCircle2 size={42} />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>
              Answers Saved Successfully!
            </h2>

            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', margin: '0 0 1.25rem' }}>
              Your responses and uploaded attachments have been securely saved and transmitted to the audit management console.
            </p>

            <div style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.8125rem',
              color: '#166534',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              ✓ Closing this page automatically...<br />
              If your browser blocks auto-close, click the button below.
            </div>

            <button
              type="button"
              onClick={() => {
                try {
                  window.open('', '_self', '');
                  window.close();
                } catch (e) { }
                try {
                  window.close();
                } catch (e) { }
                try {
                  self.close();
                } catch (e) { }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0.75rem 2rem',
                backgroundColor: '#1565C0',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(21, 101, 192, 0.3)',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0D47A1')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1565C0')}
            >
              Close Window / Tab
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
