'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, X } from 'lucide-react';
import { CrownServicesLogoMark } from '@/components/login/CrownServicesLogoMark';
import { PLANS, type PlanConfig } from '../../shared/plans';

export type PlanBillCurrency = 'EGP' | 'USD';

type DisplayFeature = PlanConfig['displayFeatures'][number];

type FeatureSegment =
  | { kind: 'line'; f: DisplayFeature }
  | { kind: 'neon'; items: DisplayFeature[] };

function segmentPlanFeatures(features: DisplayFeature[]): FeatureSegment[] {
  const out: FeatureSegment[] = [];
  let i = 0;
  while (i < features.length) {
    const f = features[i];
    if (f.highlightGroup) {
      const gid = f.highlightGroup;
      const items: DisplayFeature[] = [];
      while (i < features.length && features[i].highlightGroup === gid) {
        items.push(features[i]);
        i++;
      }
      out.push({ kind: 'neon', items });
      continue;
    }
    if (f.highlightNeon) {
      out.push({ kind: 'neon', items: [f] });
      i++;
      continue;
    }
    out.push({ kind: 'line', f });
    i++;
  }
  return out;
}

export type PlanCardsProps = {
  /** When set, currency is controlled by the parent (e.g. login page shares state with landing sections). */
  billCurrency?: PlanBillCurrency;
  onBillCurrencyChange?: (c: PlanBillCurrency) => void;
};

export function PlanCards({ billCurrency: controlledCurrency, onBillCurrencyChange }: PlanCardsProps = {}) {
  const { language } = useLanguage();
  const [internalCurrency, setInternalCurrency] = useState<PlanBillCurrency>(() => (language === 'ar' ? 'EGP' : 'USD'));
  const isControlled = controlledCurrency !== undefined;
  const billCurrency = isControlled ? controlledCurrency! : internalCurrency;
  const setBillCurrency = (c: PlanBillCurrency) => {
    onBillCurrencyChange?.(c);
    if (!isControlled) setInternalCurrency(c);
  };

  /** UI strings follow AR/EN toggle; EGP/USD only switches price amounts & currency symbol. */
  const tp = (ar: string, en: string) => (language === 'ar' ? ar : en);

  /** plan.pricing.ar = EGP figures, .en = USD figures (see shared/plans.ts). */
  const pricingKey: 'ar' | 'en' = billCurrency === 'EGP' ? 'ar' : 'en';
  /** English UI: EGP / $ — not Arabic «ج.م» when language is English. */
  const symbol = billCurrency === 'USD' ? '$' : language === 'ar' ? 'ج.م' : 'EGP';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <CrownServicesLogoMark size="sm" className="drop-shadow-[0_0_12px_rgba(0,243,255,0.4)]" />
          <span className="text-sm font-semibold text-white">{tp('الباقات', 'Plans')}</span>
        </div>
        <div
          className="flex gap-1 rounded-lg border border-cyan-500/35 bg-cyan-500/5 p-0.5"
          role="group"
          aria-label={tp('العملة', 'Currency')}
        >
          <button
            type="button"
            onClick={() => setBillCurrency('USD')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              billCurrency === 'USD' ? 'bg-cyan-500 text-[#0a0e17] shadow-[0_0_12px_rgba(0,243,255,0.4)]' : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            USD
          </button>
          <button
            type="button"
            onClick={() => setBillCurrency('EGP')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              billCurrency === 'EGP' ? 'bg-cyan-500 text-[#0a0e17] shadow-[0_0_12px_rgba(0,243,255,0.4)]' : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            EGP
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const pricing = plan.pricing[pricingKey];
          const priceMonthly = pricing?.monthly ?? 0;
          const priceYearly = pricing?.yearly ?? 0;
          const isGold = plan.highlight;
          const isBranches = plan.id === 'branches';
          const segments = segmentPlanFeatures(plan.displayFeatures);
          let checkAnim = 0;
          const nextDelay = () => {
            const ms = checkAnim * 68;
            checkAnim += 1;
            return ms;
          };
          return (
            <div key={plan.id} className="relative pt-1">
              {(isGold || isBranches) && (
                <div
                  aria-hidden
                  className="animate-login-plan-halo pointer-events-none absolute -inset-1 z-0 rounded-2xl bg-gradient-to-br from-cyan-400/35 via-cyan-500/15 to-transparent blur-lg"
                />
              )}
              <div
                className={`relative z-10 rounded-xl border p-5 transition-shadow ${
                  isGold
                    ? 'border-cyan-400/80 bg-[#050a14]/95 shadow-[0_0_36px_rgba(0,243,255,0.28),inset_0_0_0_1px_rgba(0,243,255,0.15)]'
                    : isBranches
                      ? 'border-emerald-400/50 bg-[#050f0c]/90 shadow-[0_0_28px_rgba(52,211,153,0.22)]'
                      : 'border-cyan-500/25 bg-[#060a12]/95 shadow-[0_0_12px_rgba(0,243,255,0.06)]'
                }`}
              >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                <h3 className="text-lg font-bold text-cyan-200 capitalize">{tp(plan.nameAr, plan.nameEn)}</h3>
                {plan.highlight ? (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shrink-0">
                    {tp('الأكثر شيوعًا', 'Most Popular')}
                  </span>
                ) : isBranches ? (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/35 shrink-0">
                    {tp('مؤسسات', 'Enterprise')}
                  </span>
                ) : null}
              </div>
              <div className="mb-3">
                <span className="text-2xl font-bold text-cyan-300">
                  {symbol}
                  {priceMonthly}
                </span>
                <span className="text-sm text-slate-500 ml-1">/ {tp('شهريًا', 'mo')}</span>
              </div>
              {priceYearly > 0 && (
                <div className="text-xs text-slate-500 mb-3">
                  {tp('سنويًا:', 'Yearly:')} {symbol}
                  {priceYearly}
                </div>
              )}
              <div className="text-sm text-slate-400 mb-3">
                <span className="font-semibold text-cyan-300">
                  {plan.id === 'branches' ? tp('غير محدود', 'Unlimited') : plan.totalUsers}
                </span>{' '}
                {tp('مستخدمين', 'users')} ({tp(plan.rolesAr, plan.rolesEn)})
              </div>
              <ul className="space-y-2">
                {segments.map((seg, si) => {
                  if (seg.kind === 'line') {
                    const f = seg.f;
                    const d = nextDelay();
                    return (
                      <li key={f.key} className="flex items-center gap-2 text-sm">
                        {f.included ? (
                          <Check
                            className={`login-plan-check-icon h-4 w-4 flex-shrink-0 ${isBranches ? 'text-emerald-400' : 'text-green-500'}`}
                            style={{ animationDelay: `${d}ms` }}
                          />
                        ) : (
                          <X className="h-4 w-4 text-slate-600 flex-shrink-0" />
                        )}
                        <span className={f.included ? 'text-slate-300' : 'text-slate-500'}>{tp(f.ar, f.en)}</span>
                      </li>
                    );
                  }
                  return (
                    <li key={`neon-${plan.id}-${si}`} className="list-none">
                      <div className="rounded-lg border border-emerald-400/65 bg-emerald-500/10 px-2.5 py-2 shadow-[0_0_14px_rgba(52,211,153,0.2)] space-y-2">
                        {seg.items.map((f) => {
                          const d = nextDelay();
                          return (
                            <div key={f.key} className="flex items-center gap-2 text-sm">
                              {f.included ? (
                                <Check
                                  className="login-plan-check-icon h-4 w-4 flex-shrink-0 text-emerald-400"
                                  style={{ animationDelay: `${d}ms` }}
                                />
                              ) : (
                                <X className="h-4 w-4 text-slate-600 flex-shrink-0" />
                              )}
                              <span className={f.included ? 'text-slate-200' : 'text-slate-500'}>{tp(f.ar, f.en)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
