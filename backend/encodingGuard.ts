const BAD_MARKERS = ["Ø", "Ã", "â€", "�", "أک", "™", "Â", "ï»¿"];

export function looksMojibake(s: string) {
  return BAD_MARKERS.some((m) => s.includes(m));
}

// محاولة إصلاح النوع الشائع (UTF-8 bytes اتقرت Latin1) -> بيرجع عربي مظبوط في حالات Ø§Ø®Ø...
export function tryFixLatin1Mojibake(s: string) {
  try {
    const fixed = Buffer.from(s, "latin1").toString("utf8");
    if (!looksMojibake(fixed) && fixed.trim()) return fixed;
  } catch {}
  return null;
}

export function sanitizeDeep(x: any): any {
  if (x == null) return x;

  if (typeof x === "string") {
    if (!looksMojibake(x)) return x;

    const fixed = tryFixLatin1Mojibake(x);
    if (fixed) return fixed;

    return "حدث خطأ. حاول مرة أخرى.";
  }

  if (Array.isArray(x)) return x.map(sanitizeDeep);

  if (typeof x === "object") {
    const out: any = {};
    for (const k of Object.keys(x)) out[k] = sanitizeDeep(x[k]);
    return out;
  }

  return x;
}
