# From prototype to product · من النموذج الأولي إلى المنتج

MA'At AI is a graduation prototype (DEPI). It is deliberately built on **free tiers** with minimum resources.
This document explains what changes when a company adopts it and why the prototype is built to make that move easy.

ماعت نموذج أولي لمشروع تخرج (DEPI)، مبني عمداً على **خدمات مجانية** وبأقل الإمكانيات. توضح هذه الوثيقة ما سيتغيّر عند تبنّي شركة له، ولماذا بُني النموذج بحيث يسهل هذا الانتقال.

## 1. Today (prototype) · اليوم

| Concern | Prototype | Limit that matters |
|---|---|---|
| Web app | Vercel Hobby | non-commercial use only |
| Logic / workflow | n8n Cloud (trial) | trial period, no SLA, gateway time limit ~50 s |
| Database, auth, vectors | Supabase Free | pauses/limits, no backups guarantee |
| AI model | Google Gemini API, free tier | about 20 requests/day per model; free-tier content may be used by Google |

Four separate vendors is acceptable for a prototype and is not what a product should look like.
أربع جهات منفصلة مقبولة في نموذج أولي، لكنها ليست الشكل المناسب لمنتج.

## 2. Built to be portable · مبني ليسهل نقله

- **Web app:** a standard Next.js app. It runs in a container on any server.
- **Data:** Supabase is PostgreSQL + pgvector + auth. It can move to a managed or self-hosted Postgres without schema changes (`supabase/schema.sql` is idempotent).
- **Logic:** the scoring code and the legal matrix are plain JS/JSON in `n8n/src` with automated tests (67 + 20). They can move into a normal backend service without changing a single rule.
- **AI:** one model node. Any provider that offers classification with structured output can replace it. The AI only classifies a fixed checklist; all numbers (score, fines, Article 49, risk) come from deterministic code.
- **Secrets:** environment variables only, never in the repository.
- **Entry point:** the browser never talks to the workflow. A single gate (`/api/maat`) enforces login, quotas, size/type checks. That gate stays the same behind a different backend.

## 3. Adoption plan · خطة الانتقال عند التبنّي

| Area | Product target |
|---|---|
| AI | Paid Gemini API or Vertex AI with a data-processing agreement, no training on customer content, a chosen region, and quota sized for real traffic |
| Hosting | One environment controlled by the adopting company (own cloud/VPC or servers), own domain and TLS, replacing the four-vendor split |
| Database | Managed PostgreSQL with automated backups and point-in-time recovery |
| Workflow engine | Move the logic into a backend service (or self-hosted n8n with a job queue) so long analyses do not depend on a gateway timeout |
| Operations | Monitoring, alerting, audit logs, rate limits per plan, billing |
| Security | Independent penetration test, dependency scanning, key rotation, least-privilege access |

## 4. Privacy as a product policy · الخصوصية كسياسة منتج

The prototype already keeps only a summary (no policy text, no report). A product should add:

1. **No retention by default;** optional saved reports that expire automatically (for example 30 days) and a "delete my data" action.
2. **Mask personal data** (emails, phone numbers, national IDs) before text is sent to the AI.
3. **Clear consent notice** before upload: who processes the text, where, and for how long.
4. **Sub-processor list and data-processing agreements** with every vendor; no vendor may train on customer content.
5. **Data residency and cross-border transfer review** against Articles 14-16 of Law 151 of 2020; appoint a DPO and keep the product's own record of processing.
6. **No policy text in any execution log** of any component (workflow engine, hosting, AI vendor).

### 4.1 What is already closed in the prototype · ما اتقفل فعلاً الآن (مجاناً)

| Gap | Status | How |
|---|---|---|
| Policy text or report stored in our database | Closed | Only a numeric summary is saved; no text, no quotes, no report |
| Workflow engine keeping executions with policy text | Closed | n8n saves neither successful nor failed production executions |
| Personal identifiers reaching the AI | Closed | Emails, Egyptian phones, national IDs and Luhn-valid card numbers are masked before the AI sees the text (tests included) |
| Users unaware of who processes their text | Closed | Privacy notice and a required consent checkbox before any audit |
| Right to erasure | Closed | "Delete my history" button; row-level security lets a user delete only his own rows |
| Over-collection / abuse | Closed | Login required, per-user and global daily quotas, field whitelist, PDF type and size checks |
| Breach path sending data to the AI | Closed | The 72-hour path is fixed computation only; nothing is sent to the AI |

### 4.2 What needs paid services, deferred to adoption · ما يحتاج خدمات مدفوعة ويُؤجَّل للتبنّي

| Gap | Why it cannot be closed for free | Planned fix |
|---|---|---|
| AI vendor may use free-tier content to improve its products | A property of the free tier | Paid Gemini API / Vertex AI under a data-processing agreement with no training and a chosen region |
| Four separate vendors, text crosses several of them | The free tiers are separate products | One environment controlled by the adopting company |
| No backups or point-in-time recovery | Not offered on the free database tier | Managed PostgreSQL with backups |
| Free-tier request limits (about 20 AI requests per day per model) | Free quota | Paid quota sized for real traffic |
| Optional saved reports with automatic expiry | Needs retention policy, encryption keys and job scheduling | Built together with the product's retention policy |
| Data residency and independent security test | Needs contracts and budget | Part of the adoption plan |

## 5. Legal quality · الجودة القانونية

- The legal matrix must be approved by a lawyer (`LEGAL_REVIEW_APPROVED`) before results stop being labelled "advisory".
- Keep a versioned matrix (`matrix_version`) and re-review when the laws or regulations change.
- Source texts for retrieval are kept in a controlled bucket and re-ingested when they change.

## 6. Ownership and licensing · الملكية والترخيص

Before transfer, the team and the initiative should agree in writing who owns the code, the legal matrix and the trained prompts, and which licence the adopting company receives. This repository is public for evaluation; the public code is not a licence to reuse it commercially.

## 7. Statement for the pitch and the judges · نص للعرض والتحكيم

**English:** "MA'At AI is a prototype built with minimum resources on free services, on purpose. Everything that can be closed at no cost is closed: we do not store policy text, we mask personal identifiers before the AI, we ask for consent, we do not keep workflow executions, and users can erase their history. What needs paid services (an AI vendor under a no-training data-processing agreement, a single controlled hosting environment, backups, higher quotas, an independent security test) is documented in this roadmap and will be done when a company adopts the product. The architecture was built portable so that move is a configuration and hosting change, not a rewrite."

**العربية:** «ماعت AI نموذج أولي بُني بأقل الإمكانيات وعلى خدمات مجانية عن قصد. كل ما يمكن إغلاقه دون تكلفة أُغلق: لا نحفظ نص السياسة، ونخفي المعرّفات الشخصية قبل الذكاء الاصطناعي، ونأخذ موافقة المستخدم، ولا نحتفظ بسجلات التنفيذ، ويستطيع المستخدم حذف سجله. أما ما يحتاج خدمات مدفوعة (مزوّد ذكاء اصطناعي باتفاقية معالجة بيانات تمنع التدريب، وبيئة استضافة واحدة تحت سيطرة الشركة، ونسخ احتياطية، وحصص أعلى، واختبار اختراق مستقل) فهو موثّق في هذه الخطة وسيُنفَّذ عند تبنّي شركة للمنتج. وقد بُنيت البنية قابلة للنقل بحيث يكون الانتقال تغيير إعدادات واستضافة لا إعادة بناء.»

## 8. Known prototype limits (stated honestly) · حدود معروفة

- Scanned PDFs are not supported (no OCR in the user flow); the 4 MB file limit comes from the hosting plan.
- Free-tier AI quotas can stop the demo under load.
- AI classification is advisory; the matrix is under legal review.
- UI language switching is complete, but analysis content (axes, gaps, penalties) is generated in Arabic until a lawyer-approved English matrix exists.
