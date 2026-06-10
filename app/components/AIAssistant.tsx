'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Send, MessageCircle, X, Copy, Volume2, VolumeX, Square, Paperclip } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePathname } from 'next/navigation';
import { apiFetch, apiRequest, useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
import { getPlanFeatures } from '../permissions';
import { getStoredShopId } from '@/lib/shop';

const VOICE_STORAGE_KEY = 'crown-ai-voice-enabled';

type PendingAction = { toolName: string; toolArgs: any };
type Message = { role: 'user' | 'assistant'; content: string; pending?: boolean; pendingAction?: PendingAction };

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

function messageIsMostlyArabic(text: string): boolean {
  return ARABIC_SCRIPT_RE.test(text);
}

/** Strip markdown and bullets before display and TTS so voice never says "نجوم". */
function sanitizeAssistantText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\*\*|__|\*|`|#+\s?|>\s?|```/g, '')
    .replace(/[•]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * TTS locale follows **UI language**, not server-detected reply language (detection can be wrong and
 * would send en-US while the app is AR and the reply is Arabic — causing English speech).
 */
function resolveTtsLang(ttsLangHint: string | undefined, text: string, fallbackUiLang: 'ar' | 'en'): string {
  if (fallbackUiLang === 'ar') return 'ar-EG';
  if (fallbackUiLang === 'en') {
    const h = String(ttsLangHint || '').trim();
    if (h.toLowerCase().startsWith('en')) return h.length >= 5 ? h : 'en-US';
    return 'en-US';
  }
  if (ARABIC_SCRIPT_RE.test(String(text || ''))) return 'ar-EG';
  return 'en-US';
}

/** Voice is Arabic-capable (Chrome/Edge sometimes tag MS voices oddly; avoid en-* default). */
function isLikelyArabicVoice(v: SpeechSynthesisVoice): boolean {
  const l = String(v.lang || '').toLowerCase().trim();
  const n = String(v.name || '').toLowerCase();
  if (l.startsWith('en')) return false;
  if (l.startsWith('ar')) return true;
  if (
    n.includes('arabic') ||
    n.includes('hoda') ||
    n.includes('laila') ||
    n.includes('nizar') ||
    n.includes('tarik') ||
    n.includes('salma') ||
    n.includes('amira') ||
    n.includes('egypt')
  )
    return true;
  return false;
}

function pickPreferredVoice(voices: SpeechSynthesisVoice[], ttsLang: string): SpeechSynthesisVoice | undefined {
  const lang = String(ttsLang || '').toLowerCase();
  const base = (lang.split('-')[0] || '').trim();
  const isArabic = base === 'ar';

  if (isArabic) {
    const pool = voices.filter(isLikelyArabicVoice);
    const score = (v: SpeechSynthesisVoice) => {
      const l = String(v.lang || '').toLowerCase();
      const n = String(v.name || '').toLowerCase();
      if (l === 'ar-eg' || l.startsWith('ar-eg')) return 100;
      if (n.includes('egypt') || n.includes('hoda') || n.includes('laila')) return 90;
      if (l.startsWith('ar-sa') || l.startsWith('ar-ae')) return 42;
      if (l.startsWith('ar-')) return 50;
      if (l === 'ar') return 40;
      if (n.includes('arabic') || n.includes('ar-')) return 20;
      return 0;
    };
    const ranked = [...pool].filter((v) => score(v) > 0).sort((a, b) => score(b) - score(a));
    if (ranked[0]) return ranked[0];
    if (pool[0]) return pool[0];
  }

  const exact = voices.find((v) => String(v.lang || '').toLowerCase() === lang);
  if (exact) return exact;
  const prefix = voices.find(
    (v) => String(v.lang || '').toLowerCase().startsWith(`${base}-`) || String(v.lang || '').toLowerCase() === base
  );
  if (prefix) return prefix;
  if (isArabic) {
    return voices.find((v) => {
      const n = String(v.name || '').toLowerCase();
      const l = String(v.lang || '').toLowerCase();
      return isLikelyArabicVoice(v) && (l.startsWith('ar') || n.includes('arabic') || n.includes('ar-'));
    });
  }
  return undefined;
}

/**
 * Chrome/Edge: Arabic voices load late (`voiceschanged`). Waiting only 900ms often leaves the
 * engine on the default **English** voice while reading Arabic. Poll until an `ar` voice exists
 * or timeout, then lock `utter.lang` to ar-EG and an Arabic `voice`.
 */
function speakUtteranceWhenVoicesReady(utter: SpeechSynthesisUtterance, ttsLang: string): void {
  const synth = window.speechSynthesis;
  const wantAr = String(ttsLang || '').toLowerCase().startsWith('ar');
  const effectiveLang = wantAr ? 'ar-EG' : ttsLang;

  const applyVoiceAndSpeak = () => {
    const voices = synth.getVoices?.() || [];
    utter.lang = effectiveLang;
    let preferred = pickPreferredVoice(voices, effectiveLang);
    if (wantAr && preferred && !isLikelyArabicVoice(preferred)) preferred = undefined;
    if (wantAr && !preferred) preferred = pickPreferredVoice(voices.filter(isLikelyArabicVoice), 'ar-EG');
    if (preferred) utter.voice = preferred;
    synth.speak(utter);
  };

  const voicesReady = () => {
    const voices = synth.getVoices?.() || [];
    if (wantAr) return voices.some(isLikelyArabicVoice);
    return voices.length > 0;
  };

  if (voicesReady()) {
    applyVoiceAndSpeak();
    return;
  }

  let done = false;
  const start = Date.now();
  const maxWaitMs = wantAr ? 4500 : 1000;
  const cleanup = () => synth.removeEventListener('voiceschanged', onVoicesChanged);
  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    applyVoiceAndSpeak();
  };
  const onVoicesChanged = () => {
    if (voicesReady()) finish();
  };
  synth.addEventListener('voiceschanged', onVoicesChanged);
  synth.getVoices?.();

  const poll = () => {
    if (done) return;
    if (voicesReady()) finish();
    else if (Date.now() - start >= maxWaitMs) finish();
    else window.setTimeout(poll, 100);
  };
  window.setTimeout(poll, 40);
}

const AI_EXAMPLE_KEYS = ['ai.example1', 'ai.example2', 'ai.example3', 'ai.example4'] as const;
const AI_QUICK_KEYS = ['ai.quick1', 'ai.quick2', 'ai.quick3', 'ai.quick4'] as const;

export function AIAssistant() {
  const { t, direction, language } = useLanguage();
  const pathname = usePathname();
  const { user, effectiveRole } = useAuth();
  const branchCtx = useBranch();
  const planFeatures = getPlanFeatures(user?.package);
  const lang = language === 'ar' ? 'ar' : 'en';
  /** TTS fallback: UI `language` + `<html lang>` so we never use en-US while the app is Arabic. */
  const ttsUiFallbackRef = useRef<'ar' | 'en'>(lang);
  useEffect(() => {
    let next: 'ar' | 'en' = language === 'ar' ? 'ar' : 'en';
    if (typeof document !== 'undefined') {
      const dl = String(document.documentElement.lang || '').toLowerCase();
      if (dl.startsWith('ar')) next = 'ar';
    }
    ttsUiFallbackRef.current = next;
  }, [language]);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiMode, setAiMode] = useState<'unknown' | 'cloud' | 'offline'>('unknown');
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessageRef = useRef<(text: string, fromVoice?: boolean) => Promise<void>>(() => Promise.resolve());
  const speechQueueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const streamSpeechBufferRef = useRef('');
  const streamSpokeRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setOpen(true);
    window.addEventListener('crown:open-ai', handler);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices?.();
      const onVoices = () => window.speechSynthesis.getVoices?.();
      window.speechSynthesis.onvoiceschanged = onVoices;
    }
    try {
      if (localStorage.getItem('crown-open-ai') === 'true') {
        localStorage.removeItem('crown-open-ai');
        setOpen(true);
      }
      const v = localStorage.getItem(VOICE_STORAGE_KEY);
      setVoiceEnabled(v === 'true');
    } catch {
      // ignore
    }
    return () => {
      window.removeEventListener('crown:open-ai', handler);
      if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const shopId = (user as any)?.shopId ?? (user as any)?.shop_id ?? null;
    if (!shopId) return;
    let alive = true;
    (async () => {
      try {
        const profile = await apiRequest('/shops/profile');
        if (alive) setStoreProfile(profile || null);
      } catch {
        if (alive) setStoreProfile(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, user]);

  const toggleVoice = useCallback(() => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VOICE_STORAGE_KEY, String(next));
      if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [voiceEnabled]);

  const stopVoice = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      speechQueueRef.current = [];
      speakingRef.current = false;
      streamSpeechBufferRef.current = '';
      setIsPlaying(false);
    }
  }, []);

  const speakNextChunk = useCallback(
    (ttsLangHint?: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (!voiceEnabled) return;
      if (speakingRef.current) return;
      const next = speechQueueRef.current.shift();
      if (!next) {
        setIsPlaying(false);
        return;
      }
      try {
        speakingRef.current = true;
        setIsPlaying(true);
        const utter = new SpeechSynthesisUtterance(next);
        const ttsLang = resolveTtsLang(ttsLangHint, next, ttsUiFallbackRef.current);
        utter.onend = () => {
          speakingRef.current = false;
          speakNextChunk(ttsLangHint);
        };
        utter.onerror = () => {
          speakingRef.current = false;
          speakNextChunk(ttsLangHint);
        };
        speakUtteranceWhenVoicesReady(utter, ttsLang);
      } catch {
        speakingRef.current = false;
        setIsPlaying(false);
      }
    },
    [voiceEnabled]
  );

  const queueSpeechChunk = useCallback(
    (chunk: string, ttsLangHint?: string) => {
      const clean = sanitizeAssistantText(chunk);
      if (!clean) return;
      streamSpokeRef.current = true;
      speechQueueRef.current.push(clean);
      speakNextChunk(ttsLangHint);
    },
    [speakNextChunk]
  );

  const queueStreamingDeltaSpeech = useCallback(
    (delta: string, ttsLangHint?: string) => {
      if (!voiceEnabled) return;
      const cleanDelta = sanitizeAssistantText(delta);
      if (!cleanDelta) return;
      streamSpeechBufferRef.current += `${cleanDelta} `;
      const chunks = streamSpeechBufferRef.current.split(/(?<=[\.\!\?\n؟])/);
      if (chunks.length <= 1) return;
      streamSpeechBufferRef.current = chunks.pop() || '';
      for (const part of chunks) {
        const candidate = part.trim();
        if (candidate.length >= 12) queueSpeechChunk(candidate, ttsLangHint);
      }
    },
    [queueSpeechChunk, voiceEnabled]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'en' ? 'en-US' : 'ar-EG';
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = (event.results[0]?.[0]?.transcript ?? '').trim();
      setInput(text);
      setListening(false);
      if (text) sendMessageRef.current(text, true);
      else setTranscribeError(true);
    };
    recognition.onerror = () => {
      setListening(false);
      setTranscribeError(true);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, [lang]);

  // Fetch AI status when the assistant is opened
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const resp = await apiFetch('/ai/status', { method: 'GET', cache: 'default' });
        const json = await resp.json().catch(() => ({}));
        if (json && (json.mode === 'cloud' || json.mode === 'offline')) {
          setAiMode(json.mode);
        } else {
          setAiMode('unknown');
        }
      } catch {
        setAiMode('offline');
      }
    })();
  }, [open]);

  const sendMessage = useCallback(
    async (text: string, fromVoice = false) => {
      if (loading || inFlightRef.current) return;
      const trimmed = typeof text === 'string' ? text.trim() : '';
      if (!trimmed) return;
      inFlightRef.current = true;
      streamSpokeRef.current = false;
      streamSpeechBufferRef.current = '';
      const analyzingText =
        lang === 'ar' ? 'جاري تحليل سؤالك...' : 'Analyzing your question...';
      const replacePendingAssistant = (
        primary: string,
        append: Message[] = [],
        options?: { keepPending?: boolean }
      ) => {
        const keepPending = Boolean(options?.keepPending);
        setMessages((prev) => {
          const next = [...prev];
          const pendingIndex = next.findIndex((m) => m.role === 'assistant' && m.pending);
          if (pendingIndex >= 0) {
            next[pendingIndex] = { role: 'assistant', content: primary, pending: keepPending || undefined };
          } else {
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
              next[lastIdx] = { role: 'assistant', content: primary, pending: keepPending || undefined };
            } else {
              next.push({ role: 'assistant', content: primary, pending: keepPending || undefined });
            }
          }
          if (append.length) next.push(...append);
          const compact: Message[] = [];
          for (const msg of next) {
            const prevMsg = compact[compact.length - 1];
            const sameAssistantText =
              prevMsg &&
              prevMsg.role === 'assistant' &&
              msg.role === 'assistant' &&
              !prevMsg.pending &&
              !msg.pending &&
              String(prevMsg.content || '').trim() === String(msg.content || '').trim();
            if (sameAssistantText) continue;
            compact.push(msg);
          }
          return compact;
        });
      };

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: analyzingText, pending: true },
      ]);
      setInput('');
      setLoading(true);
      if (fromVoice) setUploadingVoice(true);
      setErrorToast(null);

      try {
        const history = messages
          .filter((m) => !m.pending)
          .slice(-16)
          .map((m) => ({ role: m.role, content: m.content }));
        const u = user as { id?: number; userId?: number; shop_id?: number; shopId?: number } | null;
        const shopId =
          u?.shop_id ?? u?.shopId ?? (typeof window !== 'undefined' ? getStoredShopId() : null);
        const branchId =
          typeof window !== 'undefined' && shopId
            ? localStorage.getItem(`crown-active-branch-${shopId}`)
            : null;
        const context: Record<string, unknown> = {
          userId: u?.id ?? u?.userId,
          shopId: shopId ?? undefined,
          branchId: branchId ?? undefined,
          pathname: pathname ?? '',
          effectiveRole: effectiveRole ?? user?.role,
          planFeatures,
          lang,
        };
        const userRole = effectiveRole ?? user?.role;
        const rawName = String(
          (user as any)?.name ||
          (user as any)?.full_name ||
          (user as any)?.display_name ||
          ''
        ).trim();
        const ownerFallback =
          userRole === 'shop_owner' && storeProfile?.owner_name
            ? String(storeProfile.owner_name || '').trim()
            : '';
        // Use only explicit name or owner_name — never username/email prefix (no "Ahmed" from email)
        const userName =
          (rawName && !rawName.includes('@') && !/^\d+$/.test(rawName) ? rawName : '') || ownerFallback;
        const storeName =
          storeProfile?.business_name ||
          storeProfile?.name ||
          storeProfile?.business_name_ar ||
          storeProfile?.business_name_en ||
          '';
        const aiContext = {
          user: {
            id: u?.id ?? u?.userId,
            name: userName,
            role: effectiveRole ?? user?.role,
          },
          store: {
            id: storeProfile?.id ?? shopId ?? undefined,
            name: storeName,
            businessType:
              storeProfile?.activity_type ||
              storeProfile?.businessType ||
              storeProfile?.category ||
              undefined,
            currency: storeProfile?.currency_code || storeProfile?.currency_symbol || undefined,
            country: storeProfile?.country_name || undefined,
            subscription: storeProfile?.plan_type || storeProfile?.package || user?.package || undefined,
          },
          language: lang,
          enabledFeatures: planFeatures,
        };

        // Small debounce to avoid accidental double-submit bursts.
        await new Promise((resolve) => setTimeout(resolve, 120));
        const response = await apiFetch('/chat', {
          method: 'POST',
          body: JSON.stringify({ message: trimmed, lang, context, aiContext, history, stream: true }),
        });
        let data: Record<string, unknown> = {};
        let streamedReply = '';
        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const isNdjson = contentType.includes('application/x-ndjson');
        if (response.ok && isNdjson && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let pending = '';
          let streamTtsLang: string | undefined = undefined;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            pending += decoder.decode(value, { stream: true });
            let idx = pending.indexOf('\n');
            while (idx >= 0) {
              const line = pending.slice(0, idx).trim();
              pending = pending.slice(idx + 1);
              if (line) {
                try {
                  const evt = JSON.parse(line) as Record<string, unknown>;
                  if (evt.type === 'start') {
                    streamTtsLang = typeof evt.ttsLang === 'string' ? evt.ttsLang : undefined;
                  } else if (evt.type === 'delta') {
                    streamedReply = String((evt.full as string) || streamedReply);
                    const deltaText = String((evt.delta as string) || '');
                    if (deltaText) queueStreamingDeltaSpeech(deltaText, streamTtsLang);
                    if (streamedReply) replacePendingAssistant(streamedReply, [], { keepPending: true });
                  } else if (evt.type === 'done') {
                    data = evt;
                  }
                } catch {
                  // ignore malformed chunk
                }
              }
              idx = pending.indexOf('\n');
            }
          }
        } else {
          try {
            const raw = await response.text();
            data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
          } catch {
            data = {};
          }
        }

        const isAiUnavailable = data && data.ok === false && data.error === 'AI_UNAVAILABLE';
        const preferredMessage =
          lang === 'ar'
            ? (data?.message_ar as string) || (data?.messageAr as string) || (data?.message as string)
            : (data?.message_en as string) || (data?.messageEn as string) || (data?.message as string);
        const isOfflineMode = data && data.mode === 'offline';

        if (isOfflineMode) {
          const statusMsg =
            preferredMessage ||
            (lang === 'ar'
              ? 'المساعد السحابي غير متاح حالياً، سيتم استخدام المساعدة المحلية.'
              : 'AI cloud unavailable, using local help.');
          const answerText: string =
            (typeof data?.answer === 'string' ? data.answer : '') ||
            preferredMessage ||
            (lang === 'ar'
              ? 'يمكنك متابعة العمل، وسوف أساعدك بالشرح من داخل النظام بدون اتصال بسحابة AI.'
              : 'You can keep working; I will help using local in-app guidance without cloud AI.');

          setAiMode('offline');
          setErrorToast(null);
          replacePendingAssistant(statusMsg, [{ role: 'assistant', content: answerText }]);
          return;
        }

        if (!response.ok || data?.ok === false) {
          const limitReached = data?.error === 'AI limit reached';
          const geminiRate = data?.errorCode === 'GEMINI_RATE_LIMIT';
          const fallback = limitReached
            ? lang === 'ar'
              ? 'تم بلوغ حد المساعد الذكي لهذا الشهر. رقِّ باقتك أو أدخل رصيداً إضافياً من الإعدادات.'
              : 'AI limit reached for this month. Upgrade your plan or add credits in Settings.'
            : geminiRate
              ? lang === 'ar'
                ? 'خدمة الذكاء الاصطناعي مشغولة مؤقتاً. جرّب بعد قليل.'
                : 'The AI service is temporarily busy. Please try again shortly.'
              : lang === 'ar'
                ? isAiUnavailable
                  ? 'المساعد غير متاح حالياً. يرجى إعداد مفتاح AI صحيح في الخادم.'
                  : 'تعذر الرد حالياً. حاول مرة أخرى خلال لحظات.'
                : isAiUnavailable
                  ? 'AI is temporarily unavailable. Please configure a valid AI API key on the server.'
                  : 'The assistant cannot respond right now. Please try again shortly.';

          const errMsg =
            (preferredMessage as string | undefined) ||
            (data?.error as string | undefined) ||
            fallback;
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AIAssistant] chat error', { status: response.status, data });
          }
          setErrorToast(errMsg);
          replacePendingAssistant(errMsg);
          return;
        }

        if (data?.pendingAction && typeof data.pendingAction === 'object') {
          const pa = data.pendingAction as PendingAction;
          setPendingAction(pa);
          const confirmReply =
            (data?.reply as string | undefined) ?? (data?.message as string | undefined) ?? '';
          if (confirmReply) {
            replacePendingAssistant(confirmReply, [], { keepPending: false });
          }
          setAiMode('cloud');
          return;
        }

        const voiceOn =
          typeof window !== 'undefined' && localStorage.getItem(VOICE_STORAGE_KEY) === 'true';
        const reply =
          (data?.reply as string | undefined) ??
          (streamedReply || undefined) ??
          (data?.message as string | undefined) ??
          (data?.text as string | undefined) ??
          '';
        if (reply) {
          if (streamSpeechBufferRef.current.trim()) {
            queueSpeechChunk(streamSpeechBufferRef.current.trim(), typeof data?.ttsLang === 'string' ? data.ttsLang : undefined);
            streamSpeechBufferRef.current = '';
          }
          if (isNdjson && voiceOn && !streamSpokeRef.current) {
            queueSpeechChunk(reply, typeof data?.ttsLang === 'string' ? data.ttsLang : undefined);
          }
          replacePendingAssistant(reply);
          setAiMode('cloud');
        } else {
          replacePendingAssistant(
            lang === 'ar'
              ? 'لم أستلم إجابة واضحة، جرّب صياغة السؤال بشكل أوضح.'
              : 'I did not receive a clear answer. Please rephrase your question.'
          );
        }
        if (
          reply &&
          typeof window !== 'undefined' &&
          'speechSynthesis' in window &&
          voiceOn &&
          !isNdjson
        ) {
          try {
            window.speechSynthesis.cancel();
            const cleanReply = sanitizeAssistantText(reply);
            if (!cleanReply) return;
            setIsPlaying(true);
            const utter = new SpeechSynthesisUtterance(cleanReply);
            const ttsLang = resolveTtsLang(
              typeof data?.ttsLang === 'string' ? data.ttsLang : undefined,
              cleanReply,
              ttsUiFallbackRef.current
            );
            utter.onend = () => setIsPlaying(false);
            utter.onerror = () => setIsPlaying(false);
            speakUtteranceWhenVoicesReady(utter, ttsLang);
          } catch {
            setIsPlaying(false);
          }
        }
      } catch (_err) {
        const errMsg =
          lang === 'ar'
            ? 'حصلت مشكلة مؤقتة أثناء تجهيز الرد. حاول مرة ثانية.'
            : 'A temporary issue happened while preparing your answer. Please try again.';
        setErrorToast(errMsg);
        replacePendingAssistant(errMsg);
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setUploadingVoice(false);
      }
    },
    [lang, loading, messages, pathname, user, effectiveRole, planFeatures, storeProfile, queueSpeechChunk, queueStreamingDeltaSpeech]
  );

  const confirmPendingAction = useCallback(async () => {
    if (!pendingAction || loading) return;
    const action = pendingAction;
    setPendingAction(null);
    setLoading(true);
    inFlightRef.current = true;
    const confirmingText = lang === 'ar' ? 'جاري التنفيذ...' : 'Executing...';
    setMessages((prev) => [...prev, { role: 'assistant', content: confirmingText, pending: true }]);

    try {
      const u = user as { id?: number; userId?: number; shop_id?: number; shopId?: number } | null;
      const shopId = u?.shop_id ?? u?.shopId ?? (typeof window !== 'undefined' ? getStoredShopId() : null);
      const response = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: lang === 'ar' ? 'تأكيد التنفيذ' : 'Confirm execution',
          lang,
          stream: true,
          confirmAction: { toolName: action.toolName, toolArgs: action.toolArgs },
        }),
      });

      let data: Record<string, unknown> = {};
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const isNdjson = contentType.includes('application/x-ndjson');

      if (response.ok && isNdjson && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx = buf.indexOf('\n');
          while (idx >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (line) {
              try { const evt = JSON.parse(line); if (evt.type === 'done') data = evt; } catch {}
            }
            idx = buf.indexOf('\n');
          }
        }
      } else {
        try { const raw = await response.text(); data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
      }

      const reply = (data?.reply as string) || (data?.message as string) || (lang === 'ar' ? '✅ تم التنفيذ.' : '✅ Done.');
      setMessages((prev) => {
        const next = [...prev];
        const pi = next.findIndex((m) => m.role === 'assistant' && m.pending);
        if (pi >= 0) next[pi] = { role: 'assistant', content: reply };
        else next.push({ role: 'assistant', content: reply });
        return next;
      });
    } catch {
      const errMsg = lang === 'ar' ? '❌ فشل التنفيذ. حاول مرة ثانية.' : '❌ Execution failed. Please try again.';
      setMessages((prev) => {
        const next = [...prev];
        const pi = next.findIndex((m) => m.role === 'assistant' && m.pending);
        if (pi >= 0) next[pi] = { role: 'assistant', content: errMsg };
        else next.push({ role: 'assistant', content: errMsg });
        return next;
      });
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [pendingAction, loading, lang, user, storeProfile]);

  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
    const msg = lang === 'ar' ? 'تم إلغاء العملية.' : 'Action cancelled.';
    setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
  }, [lang]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading || uploadingFile) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorToast(lang === 'ar' ? 'حجم الملف أكبر من 10 ميجا.' : 'File size exceeds 10MB.');
      return;
    }

    setUploadingFile(true);
    setLoading(true);
    inFlightRef.current = true;

    const fileLabel = file.name.length > 30 ? file.name.slice(0, 27) + '...' : file.name;
    const uploadMsg = lang === 'ar' ? `📎 تم رفع: ${fileLabel}` : `📎 Uploaded: ${fileLabel}`;
    const analyzingMsg = lang === 'ar' ? '⏳ جاري تحليل الملف...' : '⏳ Analyzing file...';
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: uploadMsg },
      { role: 'assistant', content: analyzingMsg, pending: true },
    ]);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const b64 = result.split(',')[1] || result;
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await apiFetch('/chat/upload', {
        method: 'POST',
        body: JSON.stringify({
          fileData: base64,
          fileName: file.name,
          fileMime: file.type,
          message: input.trim() || '',
          lang,
        }),
      });

      let data: Record<string, unknown> = {};
      try { const raw = await response.text(); data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }

      const reply = (data?.reply as string) || (data?.message as string) || (lang === 'ar' ? 'مقدرتش أقرأ الملف.' : 'Could not read file.');
      setMessages((prev) => {
        const next = [...prev];
        const pi = next.findIndex((m) => m.role === 'assistant' && m.pending);
        if (pi >= 0) next[pi] = { role: 'assistant', content: reply };
        else next.push({ role: 'assistant', content: reply });
        return next;
      });
      setAiMode('cloud');
    } catch {
      const errMsg = lang === 'ar' ? 'فشل رفع الملف. حاول تاني.' : 'File upload failed. Try again.';
      setMessages((prev) => {
        const next = [...prev];
        const pi = next.findIndex((m) => m.role === 'assistant' && m.pending);
        if (pi >= 0) next[pi] = { role: 'assistant', content: errMsg };
        else next.push({ role: 'assistant', content: errMsg });
        return next;
      });
    } finally {
      setUploadingFile(false);
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [lang, loading, uploadingFile, input]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    if (!transcribeError) return;
    const t = setTimeout(() => setTranscribeError(false), 2500);
    return () => clearTimeout(t);
  }, [transcribeError]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyReply = useCallback((content: string) => {
    if (typeof navigator?.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(content);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1500);
    }
  }, []);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full bg-cyan-600 text-white shadow-[0_0_20px_rgba(0,243,255,0.5)] flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 left-6 z-50 w-96 max-w-[90vw] bg-[#0b1220] border border-cyan-500/40 rounded-2xl shadow-[0_0_25px_rgba(0,243,255,0.35)] flex flex-col max-h-[85vh]"
          dir={direction}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 shrink-0">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <MessageCircle className="h-4 w-4" />
                <span>{t('ai.title')}</span>
              </div>
              <span className="text-xs text-cyan-300/70">{t('ai.subtitle')}</span>
              {aiMode !== 'unknown' && (
                <span
                  className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                    aiMode === 'cloud'
                      ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40'
                      : 'bg-amber-500/15 text-amber-200 border border-amber-500/40'
                  }`}
                >
                  {aiMode === 'cloud'
                    ? language === 'ar'
                      ? '⚡ وكيل ذكي (Gemini Agent)'
                      : '⚡ Smart Agent (Gemini)'
                    : language === 'ar'
                    ? 'وضع مساعدة محلية (بدون سحابة)'
                    : 'Offline Help Mode'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleVoice}
                title={voiceEnabled ? (language === 'ar' ? 'إيقاف الصوت' : 'Voice Off') : (language === 'ar' ? 'تشغيل الصوت' : 'Voice On')}
                className={`p-1.5 rounded-lg border transition-all ${
                  voiceEnabled
                    ? isPlaying
                      ? 'border-fuchsia-400/70 bg-fuchsia-500/30 text-fuchsia-100 animate-pulse shadow-[0_0_12px_rgba(217,70,239,0.45)]'
                      : 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200'
                    : 'border-cyan-500/20 text-cyan-500/70 hover:text-cyan-300'
                }`}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              {isPlaying && (
                <button
                  type="button"
                  onClick={stopVoice}
                  title={language === 'ar' ? 'إيقاف' : 'Stop'}
                  className="p-1.5 rounded-lg border border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                >
                  <Square className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-cyan-300 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-72 overflow-y-auto shrink min-h-0">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-cyan-300/80 font-medium">{t('ai.examples')}</p>
                <div className="flex flex-col gap-1.5">
                  {AI_EXAMPLE_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setInput(t(key))}
                      className="text-left text-sm px-3 py-2 rounded-xl border border-cyan-500/25 bg-cyan-500/5 text-slate-200 hover:bg-cyan-500/15 hover:border-cyan-500/40"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, idx) => {
              const displayText =
                m.role === 'assistant' ? sanitizeAssistantText(m.content) || m.content : m.content;
              const bubbleDir = messageIsMostlyArabic(displayText) ? 'rtl' : 'ltr';
              const bubbleLang = bubbleDir === 'rtl' ? 'ar' : 'en';
              return (
              <div
                key={`msg-${idx}-${m.role}`}
                dir={bubbleDir}
                lang={bubbleLang}
                className={`text-sm px-3 py-2 rounded-xl ${
                  m.role === 'user'
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30'
                    : 'bg-fuchsia-500/10 text-slate-200 border border-fuchsia-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex-1 whitespace-pre-wrap [unicode-bidi:plaintext]">
                    {displayText}
                  </span>
                  {m.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={() => copyReply(sanitizeAssistantText(m.content) || m.content)}
                      className="shrink-0 p-1 rounded text-cyan-300 hover:bg-cyan-500/20"
                      title={t('ai.copy')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
            })}
            {pendingAction && !loading && (
              <div className="flex gap-2 px-1">
                <button
                  type="button"
                  onClick={confirmPendingAction}
                  className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                >
                  {language === 'ar' ? '✅ تأكيد التنفيذ' : '✅ Confirm'}
                </button>
                <button
                  type="button"
                  onClick={cancelPendingAction}
                  className="flex-1 px-3 py-2 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                >
                  {language === 'ar' ? '❌ إلغاء' : '❌ Cancel'}
                </button>
              </div>
            )}
            {loading && (
              <div className="text-xs text-cyan-300">
                {uploadingVoice ? t('ai.uploading') : '...'}
              </div>
            )}
            {copyToast && (
              <div className="fixed bottom-24 left-8 px-3 py-2 rounded-lg bg-cyan-600 text-white text-xs z-50 shadow-lg">
                {t('ai.copied')}
              </div>
            )}
            {transcribeError && (
              <div className="fixed bottom-24 left-8 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs z-50 shadow-lg">
                {t('ai.transcribeError')}
              </div>
            )}
            {errorToast && (
              <div className="text-xs text-red-300 px-2 py-1 rounded bg-red-500/10">
                {errorToast}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-cyan-500/20 shrink-0 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {AI_QUICK_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => sendMessage(t(key))}
                  disabled={loading}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {t(key)}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (!recognitionRef.current || listening) return;
                setTranscribeError(false);
                try {
                  recognitionRef.current.stop();
                } catch {
                  // ignore
                }
                setListening(true);
                try {
                  recognitionRef.current.start();
                } catch {
                  setListening(false);
                }
              }}
              className={`h-10 w-10 rounded-xl flex items-center justify-center border border-cyan-500/30 shrink-0 ${
                listening ? 'bg-red-500/30 text-red-100' : 'text-cyan-300'
              }`}
              title={listening ? t('ai.stop') : t('ai.voice')}
            >
              <Mic className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingFile}
              className={`h-10 w-10 rounded-xl flex items-center justify-center border border-cyan-500/30 shrink-0 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50 ${uploadingFile ? 'animate-pulse bg-cyan-500/20' : ''}`}
              title={language === 'ar' ? 'رفع ملف أو صورة' : 'Upload file or image'}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai.placeholder')}
              rows={1}
              className="flex-1 min-h-[40px] max-h-24 resize-none bg-[#0f172a] border border-cyan-500/20 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={loading}
              className="h-10 px-4 rounded-xl bg-cyan-600 text-white flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {t('ai.send')}
            </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
