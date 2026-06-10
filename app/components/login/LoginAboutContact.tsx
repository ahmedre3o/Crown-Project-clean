'use client';

import React, { useCallback, useState } from 'react';
import { Copy, Check, Mail, MessageCircle, Phone, FileText, Shield } from 'lucide-react';
import { NeonModal } from './NeonModal';
import Link from 'next/link';
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO_HREF,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  CONTACT_WHATSAPP_DISPLAY,
  CONTACT_WHATSAPP_URL,
  LOGIN_ABOUT_COPY,
  LOGIN_ABOUT_DEMO_URL,
} from './loginAboutContactCopy';

type Lang = 'ar' | 'en';

type LoginAboutContactProps = {
  language: Lang;
};

type CopiedKey = 'email' | 'whatsapp' | 'phone' | null;

/**
 * About Us + Contact Us links below the login card (same neon style).
 */
export function LoginAboutContact({ language }: LoginAboutContactProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState<CopiedKey>(null);

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const about = language === 'ar' ? LOGIN_ABOUT_COPY.ar : LOGIN_ABOUT_COPY.en;

  const flashCopied = useCallback((key: Exclude<CopiedKey, null>) => {
    setCopied(key);
    window.setTimeout(() => setCopied(null), 2200);
  }, []);

  const copyText = useCallback(
    async (text: string, key: Exclude<CopiedKey, null>) => {
      try {
        await navigator.clipboard.writeText(text);
        flashCopied(key);
      } catch {
        setCopied(null);
      }
    },
    [flashCopied]
  );

  const neonBtnClass =
    'group inline-flex items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/5 px-3 sm:px-4 py-2.5 text-sm font-medium text-cyan-200 shadow-[0_0_20px_rgba(0,243,255,0.08)] transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:shadow-[0_0_28px_rgba(0,243,255,0.15)] focus:outline-none focus:ring-2 focus:ring-cyan-400/40 w-full min-h-[2.75rem]';

  const contactRows = [
    {
      key: 'email' as const,
      icon: Mail,
      label: language === 'ar' ? 'البريد الإلكتروني' : 'Email',
      href: CONTACT_MAILTO_HREF,
      display: CONTACT_EMAIL,
      copyValue: CONTACT_EMAIL,
      accent: 'text-cyan-300',
    },
    {
      key: 'whatsapp' as const,
      icon: MessageCircle,
      label: language === 'ar' ? 'واتساب' : 'WhatsApp',
      href: CONTACT_WHATSAPP_URL,
      display: CONTACT_WHATSAPP_DISPLAY,
      copyValue: CONTACT_WHATSAPP_DISPLAY,
      accent: 'text-green-400',
      external: true,
    },
    {
      key: 'phone' as const,
      icon: Phone,
      label: language === 'ar' ? 'الهاتف' : 'Phone',
      href: CONTACT_PHONE_TEL,
      display: CONTACT_PHONE_DISPLAY,
      copyValue: CONTACT_PHONE_DISPLAY,
      accent: 'text-cyan-300',
    },
  ];

  return (
    <>
      <nav
        className="flex flex-col gap-3 w-full max-w-md px-2"
        aria-label={language === 'ar' ? 'معلومات قانونية وتواصل' : 'Legal & contact'}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <button type="button" onClick={() => setAboutOpen(true)} className={neonBtnClass}>
            {language === 'ar' ? 'من نحن' : 'About Us'}
          </button>
          <button
            type="button"
            className={neonBtnClass}
            onClick={() => {
              window.location.href = CONTACT_MAILTO_HREF;
            }}
          >
            {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
          </button>
          <Link href="/privacy" className={`${neonBtnClass} gap-1.5`}>
            <Shield className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="text-center leading-tight">
              {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </span>
          </Link>
          <Link href="/terms" className={`${neonBtnClass} gap-1.5`}>
            <FileText className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="text-center leading-tight">
              {language === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}
            </span>
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setContactOpen(true)}
          className="text-xs text-cyan-400/85 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-500/50 mx-auto"
        >
          {language === 'ar' ? 'جميع قنوات التواصل (واتساب، هاتف)' : 'All contact channels (WhatsApp, phone)'}
        </button>
      </nav>

      <NeonModal open={aboutOpen} onClose={() => setAboutOpen(false)} title={about.title} dir={dir} titleId="login-about-title">
        <div className="max-h-[min(70vh,620px)] overflow-y-auto pr-1 space-y-4 text-sm text-slate-300 leading-relaxed">
          <p className="text-slate-200/95 leading-relaxed border-b border-cyan-500/15 pb-3">{about.saasIntro}</p>
          <div className="whitespace-pre-line">{about.intro}</div>
          <div className="whitespace-pre-line border-t border-cyan-500/20 pt-3">{about.story}</div>
          <div className="whitespace-pre-line border-t border-cyan-500/20 pt-3 text-slate-400">{about.aboutMeta}</div>
          <div className="space-y-2 border-t border-cyan-500/20 pt-3">
            <p className="font-semibold text-cyan-200/95">{about.masterclassTitle}</p>
            <p>{about.masterclassBody}</p>
            <Link
              href={LOGIN_ABOUT_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-semibold text-cyan-400 underline-offset-2 hover:text-cyan-300 hover:underline shadow-[0_0_12px_rgba(34,211,238,0.35)]"
            >
              {about.demoLinkText}
            </Link>
          </div>
          <p className="whitespace-pre-line border-t border-cyan-500/20 pt-3 text-slate-400">{about.footer}</p>
        </div>
      </NeonModal>

      <NeonModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={language === 'ar' ? 'اتصل بنا' : 'Contact Us'}
        dir={dir}
        titleId="login-contact-title"
      >
        <div className="space-y-4">
          {contactRows.map((row) => {
            const Icon = row.icon;
            const isCopied = copied === row.key;
            return (
              <div key={row.key}>
                <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 opacity-80" />
                  {row.label}
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl border border-cyan-500/25 bg-[#0f172a]/80 p-3">
                  <a
                    href={row.href}
                    target={row.external ? '_blank' : undefined}
                    rel={row.external ? 'noopener noreferrer' : undefined}
                    className={`flex-1 min-w-0 text-sm font-medium break-all transition-colors hover:underline ${row.accent}`}
                  >
                    {row.display}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(row.copyValue, row.key)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-300 shrink-0 ${
                      isCopied
                        ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-200 ring-2 ring-emerald-400/50 shadow-[0_0_22px_rgba(52,211,153,0.45)]'
                        : 'border-cyan-500/45 bg-cyan-500/10 text-cyan-200 shadow-[0_0_16px_rgba(0,243,255,0.28)] hover:bg-cyan-500/20 hover:shadow-[0_0_26px_rgba(0,243,255,0.5)]'
                    }`}
                  >
                    {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    {isCopied
                      ? language === 'ar'
                        ? 'تم النسخ'
                        : 'Copied'
                      : language === 'ar'
                        ? 'نسخ'
                        : 'Copy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </NeonModal>
    </>
  );
}
