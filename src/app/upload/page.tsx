'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import styles from './upload.module.css';

const PENDING_GENERATION_KEY = 'pendingGeneration';
const UPLOAD_DB_NAME = 'yamaha-upload-state';
const UPLOAD_STORE_NAME = 'files';
const UPLOAD_FILE_KEY = 'pending-upload';
const PENDING_GENERATION_TIMEOUT_MS = 1.5 * 60 * 1000;

type PendingGeneration = {
  requestId: string;
  startedAt: number;
};

type GenerationStatusResponse = {
  generationId?: string;
  status?: 'not_found' | 'processing' | 'completed' | 'failed';
};

type RetryMode = 'hidden' | 'retry-current' | 'restart-flow';

function createRequestId() {
  return crypto.randomUUID().replace(/-/g, '');
}

function openUploadDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(UPLOAD_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(UPLOAD_STORE_NAME)) {
        db.createObjectStore(UPLOAD_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePendingFile(blob: Blob) {
  const db = await openUploadDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
    tx.objectStore(UPLOAD_STORE_NAME).put(blob, UPLOAD_FILE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadPendingFile() {
  const db = await openUploadDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readonly');
    const request = tx.objectStore(UPLOAD_STORE_NAME).get(UPLOAD_FILE_KEY);
    request.onsuccess = () => resolve((request.result as Blob | undefined) || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

async function clearPendingFile() {
  const db = await openUploadDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
    tx.objectStore(UPLOAD_STORE_NAME).delete(UPLOAD_FILE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function readPendingGeneration(): PendingGeneration | null {
  const raw = localStorage.getItem(PENDING_GENERATION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingGeneration>;
    if (typeof parsed.requestId === 'string' && typeof parsed.startedAt === 'number') {
      return {
        requestId: parsed.requestId,
        startedAt: parsed.startedAt,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function writePendingGeneration(value: PendingGeneration) {
  localStorage.setItem(PENDING_GENERATION_KEY, JSON.stringify(value));
}

function isPendingGenerationExpired(pendingGeneration: PendingGeneration) {
  return Date.now() - pendingGeneration.startedAt >= PENDING_GENERATION_TIMEOUT_MS;
}

async function clearPendingGeneration(options?: { keepFile?: boolean }) {
  localStorage.removeItem(PENDING_GENERATION_KEY);
  if (!options?.keepFile) {
    await clearPendingFile();
  }
}

export default function Upload() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const loadingMessages = t.upload.loadingMessages;
  const [campaignStatusLoaded, setCampaignStatusLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [retryMode, setRetryMode] = useState<RetryMode>('hidden');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quizData, setQuizData] = useState<any>(null);
  const resumeAttemptedRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);

  const restoreSavedFile = async () => {
    const savedBlob = await loadPendingFile();
    if (!savedBlob) return null;

    const restoredFile = new File([savedBlob], 'upload.jpg', {
      type: savedBlob.type || 'image/jpeg',
    });

    setFile(restoredFile);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(restoredFile);
    previewUrlRef.current = objectUrl;
    setPreview(objectUrl);

    return restoredFile;
  };

  const finalizeGeneration = async (data: { generationId: string }) => {
    await clearPendingGeneration();
    localStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('quizState');
    sessionStorage.removeItem('quizResult');
    router.push(`/result/${data.generationId}`);
  };

  const showRetryState = async (
    message: string,
    mode: RetryMode,
    options?: { keepFile?: boolean }
  ) => {
    setLoading(false);
    setError(message);
    setRetryMode(mode);
    await clearPendingGeneration({ keepFile: options?.keepFile });
  };

  const checkExistingGeneration = async (requestId: string) => {
    const res = await fetch(`/api/generate?requestId=${requestId}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data as GenerationStatusResponse;
  };

  const waitForGenerationCompletion = async (pendingGeneration: PendingGeneration) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (isPendingGenerationExpired(pendingGeneration)) {
        return { status: 'expired' as const };
      }

      const status = await checkExistingGeneration(pendingGeneration.requestId);
      if (!status) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }

      if (status.status === 'completed' && status.generationId) {
        return status;
      }

      if (status.status === 'failed') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    return null;
  };

  useEffect(() => {
    async function initUploadPage() {
      try {
        const res = await fetch('/api/campaign-status', {
          cache: 'no-store',
        });
        const campaignStatus = await res.json();

        if (campaignStatus.campaignCompleted) {
          router.replace('/thank-you');
          return;
        }
      } catch (fetchError) {
        console.error('Failed to fetch campaign status', fetchError);
      } finally {
        setCampaignStatusLoaded(true);
      }

      const data = sessionStorage.getItem('quizResult');
      if (data) {
        setQuizData(JSON.parse(data));
      }

      const pendingGeneration = readPendingGeneration();
      if (pendingGeneration && isPendingGenerationExpired(pendingGeneration)) {
        void clearPendingGeneration({ keepFile: true });
        setError(t.upload.expiredPrevious);
        setRetryMode(data ? 'retry-current' : 'restart-flow');
      }

      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

      if (!isAuthenticated && !pendingGeneration) {
        router.push('/');
        return;
      }

      if (!data && !pendingGeneration) {
        router.push('/quiz');
      }
    }

    void initUploadPage();
  }, [router, t.upload.expiredPrevious]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    if (loading) {
      window.history.pushState({ generationLocked: true }, '', window.location.href);
      window.addEventListener('beforeunload', handleBeforeUnload);
      const handlePopState = () => {
        window.history.pushState({ generationLocked: true }, '', window.location.href);
      };
      window.addEventListener('popstate', handlePopState);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);

      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }

    return undefined;
  }, [loading, loadingMessages.length]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function resizeImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1080;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.9);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  }

  const submitGeneration = async (currentFile: File, currentQuizData: any, requestId: string) => {
    setLoading(true);
    setError('');
    setRetryMode('hidden');
    writePendingGeneration({ requestId, startedAt: Date.now() });

    try {
      const existingGeneration = await checkExistingGeneration(requestId);
      if (existingGeneration?.generationId && (existingGeneration.status === 'completed' || existingGeneration.status === 'failed')) {
        await finalizeGeneration({ generationId: existingGeneration.generationId });
        return;
      }
      if (existingGeneration?.status === 'processing') {
        const completedGeneration = await waitForGenerationCompletion({
          requestId,
          startedAt: Date.now(),
        });
        if (completedGeneration?.status === 'completed' && completedGeneration.generationId) {
          await finalizeGeneration({ generationId: completedGeneration.generationId });
          return;
        }
        if (completedGeneration?.status === 'failed') {
          await finalizeGeneration({ generationId: completedGeneration.generationId || requestId });
          return;
        }
        if (completedGeneration?.status === 'expired') {
          await showRetryState(
            t.upload.requestClearedLong,
            'retry-current',
            { keepFile: true }
          );
          return;
        }
        await showRetryState(
          t.upload.requestConfirmTimeout,
          'retry-current',
          { keepFile: true }
        );
        return;
      }

      const resizedBlob = await resizeImage(currentFile);
      const formData = new FormData();
      formData.append('photo', resizedBlob, 'upload.jpg');
      formData.append('persona', currentQuizData.persona);
      formData.append('requestId', requestId);
      formData.append('lang', language);

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.status === 403) {
        await clearPendingGeneration({ keepFile: true });
        router.replace('/thank-you');
        return;
      }

      if (res.ok && data.success && data.status === 'completed') {
        await finalizeGeneration({ generationId: data.generationId });
      } else if (res.ok && data.success && data.status === 'processing') {
        const completedGeneration = await waitForGenerationCompletion({
          requestId,
          startedAt: Date.now(),
        });
        if (completedGeneration?.status === 'completed' && completedGeneration.generationId) {
          await finalizeGeneration({ generationId: completedGeneration.generationId });
          return;
        }

        if (completedGeneration?.status === 'failed') {
          await finalizeGeneration({ generationId: completedGeneration.generationId || requestId });
          return;
        }

        if (completedGeneration?.status === 'expired') {
          await showRetryState(
            t.upload.requestClearedLong,
            'retry-current',
            { keepFile: true }
          );
          return;
        }

        await showRetryState(
          t.upload.requestConfirmTimeout,
          'retry-current',
          { keepFile: true }
        );
        return;
      } else if (res.ok && data.success && data.status === 'failed' && data.generationId) {
        await finalizeGeneration({ generationId: data.generationId });
        return;
      } else {
        const recoveredGeneration = await checkExistingGeneration(requestId);
        if (recoveredGeneration?.generationId && (recoveredGeneration.status === 'completed' || recoveredGeneration.status === 'failed')) {
          await finalizeGeneration({ generationId: recoveredGeneration.generationId });
          return;
        }

        await showRetryState(data.error || t.upload.generationFailed, 'retry-current', {
          keepFile: true,
        });
      }
    } catch {
      const recoveredGeneration = await checkExistingGeneration(requestId);
      if (recoveredGeneration?.generationId && (recoveredGeneration.status === 'completed' || recoveredGeneration.status === 'failed')) {
        await finalizeGeneration({ generationId: recoveredGeneration.generationId });
        return;
      }

      await showRetryState(
        t.upload.interrupted,
        'retry-current',
        { keepFile: true }
      );
    }
  };

  useEffect(() => {
    const resumePendingGeneration = async () => {
      if (resumeAttemptedRef.current) return;
      if (quizData === null) return;
      if (!campaignStatusLoaded) return;

      const pendingGeneration = readPendingGeneration();
      if (!pendingGeneration) return;
      if (isPendingGenerationExpired(pendingGeneration)) {
        const restoredFile = await restoreSavedFile();
        await showRetryState(
          t.upload.expiredTwoMinutes,
          restoredFile && quizData ? 'retry-current' : 'restart-flow',
          { keepFile: true }
        );
        return;
      }

      resumeAttemptedRef.current = true;
      setLoading(true);
      setError('');
      setRetryMode('hidden');

      const recoveredGeneration = await checkExistingGeneration(pendingGeneration.requestId);
      if (recoveredGeneration?.generationId && (recoveredGeneration.status === 'completed' || recoveredGeneration.status === 'failed')) {
        await finalizeGeneration({ generationId: recoveredGeneration.generationId });
        return;
      }
      if (recoveredGeneration?.status === 'processing') {
        const completedGeneration = await waitForGenerationCompletion(pendingGeneration);
        if (completedGeneration?.status === 'completed' && completedGeneration.generationId) {
          await finalizeGeneration({ generationId: completedGeneration.generationId });
          return;
        }
        if (completedGeneration?.status === 'failed') {
          await finalizeGeneration({ generationId: completedGeneration.generationId || pendingGeneration.requestId });
          return;
        }
        if (completedGeneration?.status === 'expired') {
          const restoredFile = await restoreSavedFile();
          await showRetryState(
            t.upload.previousPendingTooLong,
            restoredFile && quizData ? 'retry-current' : 'restart-flow',
            { keepFile: true }
          );
          return;
        }
        const restoredFile = await restoreSavedFile();
        await showRetryState(
          t.upload.previousConfirmTimeout,
          restoredFile && quizData ? 'retry-current' : 'restart-flow',
          { keepFile: true }
        );
        return;
      }

      const restoredFile = await restoreSavedFile();
      if (!restoredFile || !quizData) {
        await showRetryState(
          t.upload.previousInterruptedRestart,
          'restart-flow'
        );
        return;
      }

      await submitGeneration(restoredFile, quizData, pendingGeneration.requestId);
    };

    void resumePendingGeneration();
  }, [campaignStatusLoaded, quizData, t.upload]);

  if (!campaignStatusLoaded) {
    return (
      <main className="page-container">
        <div style={{ textAlign: 'center' }} className="fade-in">
          <h2 style={{ fontSize: '28px' }}>{t.common.loading}</h2>
          <div className="spinner" style={{ margin: '16px auto 0' }}></div>
        </div>
      </main>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 6 * 1024 * 1024) {
        setError(t.upload.fileTooLarge);
        return;
      }

      void savePendingFile(selected);
      setFile(selected);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(selected);
      previewUrlRef.current = objectUrl;
      setPreview(objectUrl);
      setError('');
    }
  };

  const handleGenerate = async () => {
    if (!file || !quizData) return;

    await submitGeneration(file, quizData, createRequestId());
  };

  const handleCreateAgain = async () => {
    setError('');
    setRetryMode('hidden');

    if (file && quizData) {
      await submitGeneration(file, quizData, createRequestId());
      return;
    }

    const restoredFile = await restoreSavedFile();
    if (restoredFile && quizData) {
      await submitGeneration(restoredFile, quizData, createRequestId());
      return;
    }

    localStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('quizState');
    sessionStorage.removeItem('quizResult');
    await clearPendingGeneration();
    router.push('/');
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className={styles.loadingContainer}>
          <div className={styles.skeleton}></div>
          <div className={styles.loadingMessage}>
            <p className={styles.fadeText}>{loadingMessages[loadingStep]}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className={`${styles.container} fade-in`}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', fontFamily: 'Outfit' }}>{t.upload.title}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
          {t.upload.subtitle}
        </p>

        {error && <div style={{ color: '#ff4d4d', marginBottom: '16px', fontSize: '13px', background: 'rgba(255,77,77,0.1)', padding: '8px', borderRadius: '4px' }}>{error}</div>}

        <div
          className={styles.uploadBox}
          onClick={() => fileInputRef.current?.click()}
          style={{ borderColor: preview ? 'transparent' : 'rgba(255,255,255,0.2)' }}
        >
          {preview ? (
            <img src={preview} alt="Preview" className={styles.preview} />
          ) : (
            <div className={styles.uploadText}>
              <span className={styles.icon}>👤</span>
              <h3 style={{ fontSize: '18px', fontWeight: '500' }}>{t.upload.tapToSelect}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>{t.upload.maxFile}</p>
            </div>
          )}
          {preview && (
            <div className={styles.uploadText} style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
              <p style={{ fontSize: '14px', color: 'white' }}>{t.upload.tapToChange}</p>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />

        <button
          className="primary-button"
          disabled={!file}
          onClick={handleGenerate}
          style={{ marginTop: '16px' }}
        >
          {t.upload.generateButton}
        </button>

        {retryMode !== 'hidden' && (
          <button
            className={styles.retryButton}
            onClick={handleCreateAgain}
            style={{ marginTop: '12px' }}
          >
            {t.upload.createAgain}
          </button>
        )}
      </div>
    </main>
  );
}
