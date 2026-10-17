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
const truncated = text.length > MAX_AI_CHARS;
if (truncated) text = text.slice(0, MAX_AI_CHARS);

return [{ json: { early: false, policy_text_for_ai: text, truncated, original_length: originalLength } }];
