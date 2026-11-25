import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, PageHead } from '../components/ui';

/** Bilingual legal pages for the academic demo. Not legal advice. */
const COPY = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      subtitle: 'How OneMed handles data in this academic demonstration.',
      sections: [
        ['Data we process', 'Profile details, national ID, clinical records, prescriptions, consent choices, emergency-contact details and audit events. All demo records are synthetic.'],
        ['Why we process it', 'To provide a unified patient timeline, consent-gated clinical access, prescription fulfilment, emergency information and first-aid guidance.'],
        ['Consent and control', 'Patients grant or revoke scoped access per institution or clinician. Privacy settings control exactly which fields appear on the public emergency page. Data deletion can be requested in-app and is processed within 30 days.'],
        ['Protection', 'Uploaded originals are encrypted with AES-256-GCM. Access is logged in a hash-chained audit trail. Sessions use short-lived tokens with rotating refresh tokens.'],
        ['Lawful basis and citation', 'This project is designed around Egypt Data Protection Law No. 151 of 2020. The source document also uses the year 2022 in some marketing sections; the 2020 citation is used throughout this application because it is the actual enacted law.'],
        ['Localization limitation', 'Egyptian data-centre hosting is a deployment requirement for a real service. The academic demo does not configure a region and makes no claim of production compliance.'],
        ['Contact', 'For this academic demonstration, contact the supervising faculty through your institution.'],
      ],
    },
    ar: {
      title: 'سياسة الخصوصية',
      subtitle: 'كيف تعالج OneMed البيانات في هذا العرض الأكاديمي.',
      sections: [
        ['البيانات التي نعالجها', 'بيانات الملف الشخصي والرقم القومي والسجلات والروشتات واختيارات الموافقة وبيانات اتصال الطوارئ وأحداث التدقيق. جميع بيانات العرض صناعية.'],
        ['سبب المعالجة', 'لتوفير خط زمني موحّد للمريض، ووصول سريري مقيد بالموافقة، وتنفيذ الروشتات، ومعلومات الطوارئ، وإرشادات الإسعافات الأولية.'],
        ['الموافقة والتحكم', 'يمنح المريض الوصول لكل مؤسسة أو طبيب أو يلغيه. تحدد إعدادات الخصوصية الحقول الظاهرة في صفحة الطوارئ العامة. يمكن طلب حذف البيانات من التطبيق ويُنفذ خلال 30 يومًا.'],
        ['الحماية', 'تُشفّر الملفات الأصلية بخوارزمية AES-256-GCM. يُسجّل كل وصول في سلسلة تدقيق مشفّرة. تستخدم الجلسات رموزًا قصيرة الأجل مع تحديث دوري.'],
        ['الأساس القانوني', 'صُمم هذا المشروع وفق قانون حماية البيانات المصرية رقم 151 لسنة 2020. تستخدم النسخة النهائية هذا التاريخ لأنه القانون الفعلي، مع الإشارة إلى أن بعض أقسام المستند الأصلي تذكر سنة 2022.'],
        ['قيد التوطين', 'استضافة البيانات في مراكز بيانات مصرية شرط للتشغيل الفعلي. لا يضبط العرض الأكاديمي منطقة hosting ولا يدعي الامتثال الإنتاجي.'],
        ['التواصل', 'هذا عرض أكاديمي؛ يمكن التواصل مع هيئة الإشراف الأكاديمي عبر المؤسسة التابعة لها.'],
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of Use',
      subtitle: 'Academic demonstration terms and medical safety boundaries.',
      sections: [
        ['No medical advice', 'OneMed is a navigation and data-connectivity tool. AI output is decision-support only. It never diagnoses, prescribes or replaces a qualified clinician. The treating doctor remains responsible for clinical decisions.'],
        ['Emergency use', 'The public emergency page and first-aid chatbot are temporary assistance until professional help arrives. Always call emergency services (123) first.'],
        ['Demo data', 'All names, records and identifiers in this build are synthetic. Do not enter real patient data into the demo.'],
        ['Account responsibility', 'Staff MFA is enforced. Keep credentials confidential and report suspected misuse. Demo accounts are published for the academic presentation only.'],
        ['Availability', 'This project is an academic prototype. Uptime, performance targets and penetration testing are documented as limitations, not guarantees.'],
      ],
    },
    ar: {
      title: 'شروط الاستخدام',
      subtitle: 'شروط العرض الأكاديمي وحدود السلامة الطبية.',
      sections: [
        ['ليست نصيحة طبية', 'OneMed أداة للتنقل وربط البيانات. مخرجات الذكاء الاصطناعي للتقرير فقط، ولا تشخّص أو تصف دواءً أو تُغني عن الطبيب. الطبيب المعالج مسؤول عن القرارات السريرية.'],
        ['الاستخدام الطارئ', 'صفحة الطوارئ وروبوت الإسعافات مساعدة مؤقتة حتى وصول المساعدة المتخصصة. اتصل بالإسعاف (١٢٣) أولًا دائمًا.'],
        ['بيانات العرض', 'كل الأسماء والسجلات والمعرفات في هذه النسخة صناعية. لا تُدخل بيانات مرضى حقيقية في العرض.'],
        ['مسؤولية الحساب', 'مفعّل المصادقة متعددة العوامل للعاملين. حافظ على سرية البيانات وأبلغ عن أي استخدام مشبوه. حسابات العرض منشورة للعرض الأكاديمي فقط.'],
        ['التوفر', 'هذا المشروع نموذج أكاديمي. أهداف التوفر والأداء واختبار الاختراق موثقة كقيود وليست ضمانات.'],
      ],
    },
  },
};

function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const copy = COPY[kind][lang];
  return <>
    <PageHead title={copy.title} subtitle={copy.subtitle}/>
    <Card pad><div className="card-body">{copy.sections.map(([heading, body], i) => (
      <section key={i} style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, marginBottom: 6 }}>{heading}</h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7 }}>{body}</p>
      </section>
    ))}<p className="disclaimer">© 2026 OneMed · Academic demonstration · Law No. 151 of 2020</p>
    <Link className="btn outline" to="/">{lang === 'ar' ? 'العودة للرئيسية' : 'Back to home'}</Link></div></Card>
  </>;
}

export const PrivacyPage = () => <LegalPage kind="privacy"/>;
export const TermsPage = () => <LegalPage kind="terms"/>;
