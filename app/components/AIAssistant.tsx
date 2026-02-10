'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Send, MessageCircle, X, Copy, Volume2, VolumeX, Square } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_BASE_URL } from '../api-config';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
import { getPlanFeatures } from '../permissions';

const VOICE_STORAGE_KEY = 'crown-ai-voice-enabled';

type Message = { role: 'user' | 'assistant'; content: string };

/** Strip markdown and bullets before display and TTS so voice never says "نجوم". */
function sanitizeAssistantText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\*\*|__|\*|`|#+\s?|>\s?|```/g, '')
    .replace(/[•]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessageRef = useRef<(text: string, fromVoice?: boolean) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setOpen(true);
    window.addEventListener('crown:open-ai', handler);
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
    return () => window.removeEventListener('crown:open-ai', handler);
  }, []);

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
      setIsPlaying(false);
    }
  }, []);

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
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const resp = await fetch(`${API_BASE_URL}/ai/status`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
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
      const trimmed = typeof text === 'string' ? text.trim() : '';
      if (!trimmed) return;
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setInput('');
      setLoading(true);
      if (fromVoice) setUploadingVoice(true);
      setErrorToast(null);

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const history = messages.slice(-16).map((m) => ({ role: m.role, content: m.content }));
        const u = user as { id?: number; userId?: number; shop_id?: number; shopId?: number } | null;
        const shopId =
          u?.shop_id ?? u?.shopId ??
          (typeof window !== 'undefined' ? localStorage.getItem('crown-active-shop-id') : null);
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

        const response = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: trimmed, lang, context, history }),
        });

        const data = await response.json().catch(() => ({}));

        const isAiUnavailable = data && data.ok === false && data.error === 'AI_UNAVAILABLE';
        const preferredMessage =
          lang === 'ar'
            ? data?.message_ar || data?.messageAr || data?.message
            : data?.message_en || data?.messageEn || data?.message;
        const isOfflineMode = data && data.mode === 'offline';

        if (isOfflineMode) {
          const statusMsg =
            preferredMessage ||
            (lang === 'ar'
              ? 'المساعد السحابي غير متاح حالياً، سيتم استخدام المساعدة المحلية.'
              : 'AI cloud unavailable, using local help.');
          const answerText: string =
            data?.answer ||
            preferredMessage ||
            (lang === 'ar'
              ? 'يمكنك متابعة العمل، وسوف أساعدك بالشرح من داخل النظام بدون اتصال بسحابة AI.'
              : 'You can keep working; I will help using local in-app guidance without cloud AI.');

          setAiMode('offline');
          setErrorToast(null);
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: statusMsg },
            { role: 'assistant', content: answerText },
          ]);
          return;
        }

        if (!response.ok || data?.ok === false) {
          const fallback =
            lang === 'ar'
              ? isAiUnavailable
                ? 'المساعد غير متاح حالياً. يرجى إعداد مفتاح AI صحيح في الخادم.'
                : 'فشل الاتصال بالمساعد'
              : isAiUnavailable
              ? 'AI is temporarily unavailable. Please configure a valid AI API key on the server.'
              : 'Failed to reach assistant';

          const errMsg = preferredMessage || data?.error || fallback;
          setErrorToast(errMsg);
          setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
          return;
        }

        const reply = data?.reply ?? data?.message ?? data?.text ?? '';
        if (reply) {
          setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
          setAiMode('cloud');
        }
        const voiceOn =
          typeof window !== 'undefined' && localStorage.getItem(VOICE_STORAGE_KEY) === 'true';
        if (
          reply &&
          typeof window !== 'undefined' &&
          'speechSynthesis' in window &&
          voiceOn
        ) {
          try {
            window.speechSynthesis.cancel();
            const cleanReply = sanitizeAssistantText(reply);
            if (!cleanReply) return;
            setIsPlaying(true);
            const utter = new SpeechSynthesisUtterance(cleanReply);
            const ttsLang = data?.ttsLang || (data?.lang === 'ar' ? 'ar-EG' : 'en-US');
            utter.lang = ttsLang;
            const voices = window.speechSynthesis.getVoices?.() || [];
            const preferred =
              voices.find((v) => v.lang === ttsLang) ||
              voices.find((v) => v.lang?.startsWith(ttsLang.split('-')[0]));
            if (preferred) utter.voice = preferred;
            utter.onend = () => setIsPlaying(false);
            utter.onerror = () => setIsPlaying(false);
            window.speechSynthesis.speak(utter);
          } catch {
            setIsPlaying(false);
          }
        }
      } catch (_err) {
        const errMsg = lang === 'ar' ? 'حدث خطأ أثناء الاتصال بالمساعد.' : 'An error occurred while contacting the assistant.';
        setErrorToast(errMsg);
        setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
      } finally {
        setLoading(false);
        setUploadingVoice(false);
      }
    },
    [lang, messages, pathname, user, effectiveRole, planFeatures]
  );

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
                      ? 'وضع السحابة (Gemini)'
                      : 'Cloud AI (Gemini)'
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
                className={`p-1.5 rounded-lg border ${
                  voiceEnabled
                    ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-200'
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
            {messages.map((m, idx) => (
              <div
                key={`msg-${idx}-${m.role}`}
                className={`text-sm px-3 py-2 rounded-xl ${
                  m.role === 'user'
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30'
                    : 'bg-fuchsia-500/10 text-slate-200 border border-fuchsia-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex-1 whitespace-pre-wrap">
                    {m.role === 'assistant' ? sanitizeAssistantText(m.content) || m.content : m.content}
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
            ))}
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
