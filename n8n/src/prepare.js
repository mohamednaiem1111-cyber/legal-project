// MAAT - Prepare Policy: clean the text, enforce length limits, neutralise delimiter injection.
const MIN_CHARS = 200;
const MAX_AI_CHARS = 60000;

const g = $('Guard').first().json;
const cur = $input.first().json || {};
let raw = g.has_pdf ? cur.text : g.meta.text_input;
if (typeof raw !== 'string') raw = String(raw ?? '');

let text = raw
  .normalize('NFKC')
  .replace(/\r\n?/g, '\n')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '')
  .replace(/<\/?\s*policy_document\s*>/gi, ' ')
  .replace(/[ \t]+/g, ' ')
  .split('\n').map((l) => l.trim()).join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

if (text.length < MIN_CHARS) {
  return [{
    json: {
      early: true,
      http_code: 422,
      response_body: {
        success: false,
        error_code: 'policy_too_short',
        message: 'الملف لا يحتوي نصاً كافياً للفحص (ربما هو PDF ممسوح ضوئياً). أرسل نص السياسة مباشرة أو PDF نصي.'
      }
    }
  }];
}

const originalLength = text.length;

// Privacy: mask personal identifiers BEFORE the text reaches the AI. A privacy policy rarely needs them,
// and the scorer verifies quotes against this same masked text, so results stay consistent.
const D = '[0-9٠-٩۰-۹]';
const asciiDigits = (s) => s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0)).replace(/\D/g, '');
const luhn = (digits) => { let sum = 0, alt = false; for (let i = digits.length - 1; i >= 0; i--) { let n = digits.charCodeAt(i) - 48; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; } return sum % 10 === 0; };
let piiMasked = 0;
const mask = (tag, re, accept) => { text = text.replace(re, (m) => { if (accept && !accept(m)) return m; piiMasked++; return `[${tag}]`; }); };
mask('EMAIL', /[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi);
mask('NATIONAL_ID', new RegExp(`(?<!${D})[23٢٣]${D}{13}(?!${D})`, 'g'));
mask('PHONE', new RegExp(`(?<!${D})(?:\\+?20[\\s\\-]?|0)?1[0125](?:[\\s\\-]?${D}){8}(?!${D})`, 'g'));
mask('CARD', new RegExp(`(?<!${D})(?:${D}[ \\-]?){13,19}(?!${D})`, 'g'), (m) => { const d = asciiDigits(m); return d.length >= 13 && d.length <= 19 && luhn(d); });

const truncated = text.length > MAX_AI_CHARS;
if (truncated) text = text.slice(0, MAX_AI_CHARS);

return [{ json: { early: false, policy_text_for_ai: text, truncated, original_length: originalLength, pii_masked: piiMasked } }];
