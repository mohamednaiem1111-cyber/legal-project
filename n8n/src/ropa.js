// MAAT - ROPA Draft. Built ONLY from data the requester supplied in ropa_input. Nothing is inferred. Nothing is stored.
const prev = $input.first().json;
const g = $('Guard').first().json;
const meta = g.meta || {};

const clean = (v, max = 500) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '')
  .trim()
  .slice(0, max);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const sanitize = (v, depth = 0) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return clean(v, 500);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return depth > 3 ? null : v.slice(0, 50).map((x) => sanitize(x, depth + 1));
  return null;
};
const isProvided = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
};
const field = (value, source = 'company_input') => {
  const s = sanitize(value);
  return { value: isProvided(s) ? s : null, status: isProvided(s) ? 'Provided' : 'Not provided', source: isProvided(s) ? source : 'Not supplied' };
};

let ropaInput = meta.ropa_input_raw;
if (typeof ropaInput === 'string') {
  if (ropaInput.length > 20000) ropaInput = {};
  else { try { ropaInput = JSON.parse(ropaInput); } catch (e) { ropaInput = {}; } }
}
if (!isObject(ropaInput)) ropaInput = {};

const company = isObject(ropaInput.company) ? ropaInput.company : {};
const dpo = isObject(company.dpo) ? company.dpo : {};
const companyName = isProvided(company.legal_name) ? company.legal_name : (meta.company_name !== 'Not provided' ? meta.company_name : null);

const companyDetails = {
  legal_name: field(companyName),
  registration_details: field(company.registration_details),
  address: field(company.address),
  contact_person: field(company.contact_person),
  contact_email: field(company.contact_email),
  contact_phone: field(company.contact_phone),
  role: field(company.role),
  data_protection_officer: {
    name: field(dpo.name), position: field(dpo.position), email: field(dpo.email),
    phone: field(dpo.phone), registration_details: field(dpo.registration_details)
  }
};

const activityFields = [
  ['activity_name', 'اسم نشاط المعالجة'], ['description', 'وصف النشاط'], ['purpose', 'غرض المعالجة'],
  ['data_subject_categories', 'فئات أصحاب البيانات'], ['personal_data_categories', 'فئات البيانات الشخصية'],
  ['data_sources', 'مصادر البيانات'], ['recipients', 'المستلمون'],
  ['legal_basis_or_authorization', 'الأساس القانوني أو التفويض المعلن'], ['systems_and_processors', 'الأنظمة والمعالجون المشاركون'],
  ['processing_duration', 'مدة المعالجة'], ['retention_period', 'مدة الاحتفاظ'], ['deletion_or_return_method', 'طريقة الحذف أو الإرجاع'],
  ['security_measures', 'تدابير الأمان'], ['additional_notes', 'ملاحظات إضافية']
];

const buildActivity = (activity) => {
  const a = isObject(activity) ? activity : {};
  const t = isObject(a.international_transfers) ? a.international_transfers : {};
  const record = {};
  for (const [key] of activityFields) record[key] = field(a[key]);
  record.international_transfers = {
    occurs: field(t.occurs), destination_countries: field(t.destination_countries),
    recipients: field(t.recipients), safeguards: field(t.safeguards)
  };
  const missing = activityFields.filter(([key]) => !isProvided(sanitize(a[key]))).map(([, label]) => label);
  if (!isProvided(t.occurs)) missing.push('تحديد ما إذا كان النقل الدولي للبيانات يحدث');
  else if (t.occurs === true || String(t.occurs).toLowerCase() === 'yes') {
    for (const [key, label] of [['destination_countries', 'دول النقل الدولي'], ['recipients', 'مستلمو البيانات خارج الدولة'], ['safeguards', 'تفاصيل ضمانات النقل']]) {
      if (!isProvided(sanitize(t[key]))) missing.push(label);
    }
  }
  return { ...record, missing_information: missing };
};

const processingActivities = (Array.isArray(ropaInput.processing_activities) ? ropaInput.processing_activities : [])
  .filter(isObject).slice(0, 30).map(buildActivity);

const missingCompany = [
  ['legal_name', 'الاسم القانوني للشركة', companyDetails.legal_name.value],
  ['registration_details', 'بيانات تسجيل الشركة', companyDetails.registration_details.value],
  ['address', 'عنوان الشركة', companyDetails.address.value],
  ['contact_person', 'الشخص المسؤول عن التواصل', companyDetails.contact_person.value],
  ['contact_email', 'البريد الإلكتروني للتواصل', companyDetails.contact_email.value],
  ['role', 'تحديد دور الشركة كمتحكم أو معالج أو كليهما', companyDetails.role.value]
].filter(([, , v]) => !isProvided(v)).map(([, label]) => label);
if (processingActivities.length === 0) missingCompany.push('لم تُدخل بيانات أنشطة المعالجة الفعلية');

const allMissing = [...missingCompany, ...processingActivities.flatMap((act, i) => act.missing_information.map((m) => 'النشاط ' + (i + 1) + ': ' + m))];

const ropa = {
  document_type: 'Draft ROPA',
  title: 'Record of Processing Activities',
  company_details: companyDetails,
  processing_activities: processingActivities,
  missing_information: [...new Set(allMissing)],
  status: processingActivities.length > 0 && allMissing.length === 0 ? 'Ready for human review' : 'Incomplete draft',
  limitations: [
    'هذه مسودة وليست سجلاً مكتملاً أو معتمداً.',
    'بيانات تدقيق سياسة الخصوصية لا تثبت وحدها جميع أنشطة المعالجة الفعلية.',
    'المعلومات الناقصة لا تُعد تلقائياً دليلاً على مخالفة قانونية.',
    'يجب مراجعة المعلومات مقابل عمليات الشركة الفعلية والمتطلبات القانونية المنطبقة.',
    'لا يُثبت اكتمال الحقول وحده الامتثال القانوني.',
    'لا يتم حفظ بيانات الـ ROPA في قاعدة البيانات.'
  ]
};

return [{ json: { ok: true, http_code: 200, storage: prev.storage, response_body: { ...prev.response_body, ropa_draft: ropa } } }];
