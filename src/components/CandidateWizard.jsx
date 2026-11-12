import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, Clock, ChevronLeft, ChevronRight, Upload, 
  Camera, FileText, ShieldCheck, HeartPulse, UserCheck, Receipt, 
  FileBadge, Check, AlertCircle, ArrowRight, Lock, Sparkles, Send,
  ShieldAlert, HelpCircle, X, Building, CreditCard, Calendar, 
  MapPin, Phone, Mail, User, Info, FileCheck, AlertTriangle, Eye
} from 'lucide-react';
import SignaturePad from './SignaturePad';

// Israeli ID Checksum Validator (Luhn algorithm for 9-digit Teudat Zehut)
export const isValidIsraeliID = (idStr) => {
  if (!idStr) return false;
  const cleanId = String(idStr).trim().padStart(9, '0');
  if (cleanId.length !== 9 || isNaN(cleanId)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let num = Number(cleanId.charAt(i));
    let step = num * ((i % 2) + 1);
    sum += step > 9 ? step - 9 : step;
  }
  return sum % 10 === 0;
};

export default function CandidateWizard({ token, onCompleteSubmission, onBackToDashboard }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // Wizard Steps: 0 = Welcome, 1 = Personal Info, 2 = Bank & Tax (101), 3 = Document Uploads & Contract, 4 = Review & Submit, 5 = Thank You
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    fullName: '',
    gender: 'אישה',
    idNumber: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    maritalStatus: 'רווק/ה',
    assignedApartment: '',

    // Step 2: Banking & Tax
    bankName: 'בנק הפועלים (12)',
    bankBranch: '',
    accountNumber: '',
    payslipConsent: true,
    isIsraeliResident: 'כן',
    otherIncomeType: 'אין לי כלל הכנסות אחרות ממשכורת או מקצבה',
    childrenUnder18Count: '0',
    isSingleParent: 'לא',
    hasActivePension: 'כן - יש לי קופה פעילה (אצרף טופס קוביות)',
    pensionFundName: '',
    hasOtherJob: 'אין עבודה נוספת - זוהי משרתי היחידה והעיקרית',
    declaration101: true,

    // Step 3: Document Files & Signatures
    idCardFile: '',
    bankConfirmationFile: '',
    policeHelplessFile: '',
    policeSexOffenseFile: '',
    medicalDoctorCertFile: '',
    resumeFile: '',
    consentPoliceHelpless: true,
    consentPoliceSexOffense: true,
    agreeWelfareConfidentiality: true,
    agreeContractTerms: true,
    medicalFitnessStatement: true,
    isSocialWorker: 'לא',
    socialWorkerCertFile: '',
    signature: ''
  });

  const [uploadingField, setUploadingField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Waiver request modal state
  const [waiverModalField, setWaiverModalField] = useState(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [submittingWaiver, setSubmittingWaiver] = useState(false);

  // Fetch Onboarding Data for this token
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/onboarding/${token}`);
      if (!res.ok) {
        throw new Error('קישור לא תקין או שהעובד/ת לא נמצא במערכת');
      }
      const json = await res.json();
      setData(json);

      // Hydrate state from existing employee submissions
      const emp = json.employee;
      const sub = emp.submissions || {};
      
      const pBank = sub['form-personal-bank'] || {};
      const pHelpless = sub['form-police-helpless'] || {};
      const pSex = sub['form-police-sexual-offenses'] || {};
      const conf = sub['form-confidentiality-welfare'] || {};
      const contract = sub['form-employment-contract'] || {};
      const health = sub['form-health-and-docs'] || {};
      const pension = sub['form-pension-and-tax'] || {};
      const f101 = sub['form-101-digital'] || {};

      setFormData(prev => ({
        ...prev,
        fullName: pBank.fullName || emp.fullName || '',
        gender: pBank.gender || emp.gender || 'אישה',
        idNumber: pBank.idNumber || emp.idNumber || '',
        birthDate: pBank.birthDate || '',
        phone: pBank.phone || emp.phone || '',
        email: pBank.email || emp.email || '',
        address: pBank.address || '',
        maritalStatus: pBank.maritalStatus || 'רווק/ה',
        assignedApartment: contract.assignedApartment || emp.assignedApartment || '',

        bankName: pBank.bankName || 'בנק הפועלים (12)',
        bankBranch: pBank.bankBranch || '',
        accountNumber: pBank.accountNumber || '',
        payslipConsent: pBank.payslipConsent !== undefined ? pBank.payslipConsent : true,
        isIsraeliResident: f101.isIsraeliResident || 'כן',
        otherIncomeType: f101.otherIncomeType || 'אין לי כלל הכנסות אחרות ממשכורת או מקצבה',
        childrenUnder18Count: f101.childrenUnder18Count || '0',
        isSingleParent: f101.isSingleParent || 'לא',
        hasActivePension: pension.hasActivePension || 'כן - יש לי קופה פעילה (אצרף טופס קוביות)',
        pensionFundName: pension.pensionFundName || '',
        hasOtherJob: pension.hasOtherJob || 'אין עבודה נוספת - זוהי משרתי היחידה והעיקרית',
        declaration101: f101.declaration101 !== undefined ? f101.declaration101 : true,

        idCardFile: pBank.idCardFile || '',
        bankConfirmationFile: pBank.bankConfirmationFile || '',
        policeHelplessFile: pHelpless.policeHelplessFile || '',
        policeSexOffenseFile: pSex.policeSexOffenseFile || '',
        medicalDoctorCertFile: health.medicalDoctorCertFile || '',
        resumeFile: health.resumeFile || '',
        consentPoliceHelpless: pHelpless.consentPoliceHelpless !== undefined ? pHelpless.consentPoliceHelpless : true,
        consentPoliceSexOffense: pSex.consentPoliceSexOffense !== undefined ? pSex.consentPoliceSexOffense : true,
        agreeWelfareConfidentiality: conf.agreeWelfareConfidentiality !== undefined ? conf.agreeWelfareConfidentiality : true,
        agreeContractTerms: contract.agreeContractTerms !== undefined ? contract.agreeContractTerms : true,
        medicalFitnessStatement: health.medicalFitnessStatement !== undefined ? health.medicalFitnessStatement : true,
        isSocialWorker: health.isSocialWorker || 'לא',
        socialWorkerCertFile: health.socialWorkerCertFile || '',
        signature: pBank.signature || contract.signature || f101.signature || ''
      }));

      // If already submitted or approved, show completion
      if (emp.status === 'completed' || emp.status === 'approved') {
        setCurrentStep(5);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Handle field change
  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Upload handler
  const handleFileUpload = async (fieldId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingField(fieldId);
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body
      });
      const json = await res.json();
      if (res.ok && json.url) {
        handleChange(fieldId, json.url);
      } else {
        alert('שגיאה בהעלאת הקובץ');
      }
    } catch (err) {
      alert('שגיאה בתקשורת עם השרת בהעלאת הקובץ');
    } finally {
      setUploadingField(null);
    }
  };

  // Quick fill sample files for instant demo
  const handleUseSampleFile = (fieldId, sampleUrl) => {
    handleChange(fieldId, sampleUrl);
  };

  // Quick fill entire form with valid demo data
  const handleQuickFillDemo = () => {
    const isMale = formData.gender === 'גבר';
    setFormData(prev => ({
      ...prev,
      fullName: prev.fullName || 'ישראל ישראלי',
      idNumber: '031933195', // valid Israeli ID
      birthDate: '1995-04-12',
      phone: prev.phone || '050-1234567',
      email: prev.email || 'israel@example.com',
      address: 'רחוב יפו 45, ירושלים',
      maritalStatus: 'נשוי/ה',
      assignedApartment: 'דירת בית הכרם 2',
      bankName: 'בנק הפועלים (12)',
      bankBranch: '614',
      accountNumber: '458712',
      payslipConsent: true,
      declaration101: true,
      hasActivePension: 'כן - יש לי קופה פעילה (אצרף טופס קוביות)',
      pensionFundName: 'מנורה מבטחים',
      idCardFile: '/uploads/sample-id.png',
      bankConfirmationFile: '/uploads/sample-bank.png',
      policeHelplessFile: '/uploads/sample-police.png',
      policeSexOffenseFile: isMale ? '/uploads/sample-police.png' : '',
      medicalDoctorCertFile: '/uploads/sample-medical.png',
      resumeFile: '/uploads/sample-id.png',
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M20,40 Q60,10 100,35 T180,25" stroke="%231e3a8a" stroke-width="3" fill="none"/></svg>'
    }));
  };

  // Waiver request handler
  const handleRequestWaiver = async (e) => {
    e.preventDefault();
    if (!waiverModalField || !waiverReason.trim()) {
      alert('נא לציין סיבה מפורטת לבקשת הפטור');
      return;
    }

    try {
      setSubmittingWaiver(true);
      const res = await fetch(`/api/onboarding/${token}/request-waiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'candidate-wizard',
          fieldId: waiverModalField.id,
          fieldName: waiverModalField.label,
          reason: waiverReason
        })
      });

      const json = await res.json();
      if (res.ok && json.waiver) {
        setData(prev => ({
          ...prev,
          waivers: [
            json.waiver,
            ...(prev.waivers || []).filter(w => w.fieldId !== waiverModalField.id)
          ]
        }));
        alert('בקשתך הועברה ישירות ליפעת (מנהלת משאבי אנוש). ברגע שתאושר, הדרישה תחשב כמושלמת!');
        setWaiverModalField(null);
        setWaiverReason('');
      } else {
        alert('שגיאה בשליחת הבקשה');
      }
    } catch (err) {
      alert('שגיאה בתקשורת עם השרת');
    } finally {
      setSubmittingWaiver(false);
    }
  };

  // Check if a document is approved via waiver
  const isWaiverApproved = (fieldId) => {
    return (data?.waivers || []).some(w => w.fieldId === fieldId && w.status === 'approved');
  };

  const getWaiverStatus = (fieldId) => {
    return (data?.waivers || []).find(w => w.fieldId === fieldId);
  };

  // ================= STRICT VALIDATION LOGIC =================
  const getValidationItems = () => {
    const isMale = formData.gender === 'גבר';
    const isSW = formData.isSocialWorker === 'כן';

    const items = [
      // Step 1: Personal
      { id: 'fullName', label: 'שם מלא (עברית)', step: 1, valid: !!formData.fullName?.trim() },
      { id: 'idNumber', label: 'תעודת זהות תקינה (9 ספרות)', step: 1, valid: isValidIsraeliID(formData.idNumber) },
      { id: 'birthDate', label: 'תאריך לידה', step: 1, valid: !!formData.birthDate },
      { id: 'phone', label: 'טלפון נייד', step: 1, valid: !!formData.phone && formData.phone.length >= 9 },
      { id: 'email', label: 'כתובת דוא"ל לקבלת תלוש', step: 1, valid: !!formData.email && formData.email.includes('@') },
      { id: 'address', label: 'כתובת מגורים מלאה', step: 1, valid: !!formData.address?.trim() },

      // Step 2: Banking & Tax
      { id: 'bankName', label: 'שם הבנק', step: 2, valid: !!formData.bankName },
      { id: 'bankBranch', label: 'מספר סניף בנק', step: 2, valid: !!formData.bankBranch?.trim() },
      { id: 'accountNumber', label: 'מספר חשבון בנק', step: 2, valid: !!formData.accountNumber?.trim() },
      { id: 'payslipConsent', label: 'הסכמה לקבלת תלוש דיגיטלי במייל', step: 2, valid: !!formData.payslipConsent },
      { id: 'declaration101', label: 'הצהרת עובד טופס 101 מקוון', step: 2, valid: !!formData.declaration101 },

      // Step 3: Mandatory Documents & Signatures
      { 
        id: 'idCardFile', 
        label: 'צילום תעודת זהות + ספח פתוח', 
        step: 3, 
        valid: !!formData.idCardFile || isWaiverApproved('idCardFile'),
        isDoc: true,
        waiver: getWaiverStatus('idCardFile')
      },
      { 
        id: 'bankConfirmationFile', 
        label: 'אסמכתת בנק (צילום שיק מבוטל / אישור ניהול חשבון)', 
        step: 3, 
        valid: !!formData.bankConfirmationFile || isWaiverApproved('bankConfirmationFile'),
        isDoc: true,
        waiver: getWaiverStatus('bankConfirmationFile')
      },
      { 
        id: 'policeHelplessFile', 
        label: 'אישור משטרה - אלימות כלפי חסרי ישע (תשפ"ג-2023)', 
        step: 3, 
        valid: !!formData.policeHelplessFile || isWaiverApproved('policeHelplessFile'),
        isDoc: true,
        waiver: getWaiverStatus('policeHelplessFile')
      },
      // Police clearance for sex offenses - strictly required for MALES only!
      ...(isMale ? [{
        id: 'policeSexOffenseFile',
        label: 'אישור משטרה - עברייני מין (גברים בלבד כחוק)',
        step: 3,
        valid: !!formData.policeSexOffenseFile || isWaiverApproved('policeSexOffenseFile'),
        isDoc: true,
        waiver: getWaiverStatus('policeSexOffenseFile')
      }] : []),
      { 
        id: 'medicalDoctorCertFile', 
        label: 'אישור רפואי מרופא משפחה (כשירות לעבודה)', 
        step: 3, 
        valid: !!formData.medicalDoctorCertFile || isWaiverApproved('medicalDoctorCertFile'),
        isDoc: true,
        waiver: getWaiverStatus('medicalDoctorCertFile')
      },
      { 
        id: 'resumeFile', 
        label: 'קורות חיים מעודכנים', 
        step: 3, 
        valid: !!formData.resumeFile || isWaiverApproved('resumeFile'),
        isDoc: true,
        waiver: getWaiverStatus('resumeFile')
      },
      ...(isSW ? [{
        id: 'socialWorkerCertFile',
        label: 'תעודת רישום בפנקס העו"ס וזכאות לתואר',
        step: 3,
        valid: !!formData.socialWorkerCertFile || isWaiverApproved('socialWorkerCertFile'),
        isDoc: true,
        waiver: getWaiverStatus('socialWorkerCertFile')
      }] : []),
      { id: 'agreeWelfareConfidentiality', label: 'התחייבות לשמירת סודיות (משרד הרווחה)', step: 3, valid: !!formData.agreeWelfareConfidentiality },
      { id: 'agreeContractTerms', label: 'הסכם עבודה אישי וסעיף 14', step: 3, valid: !!formData.agreeContractTerms },
      { id: 'signature', label: 'חתימה דיגיטלית מאושרת', step: 3, valid: !!formData.signature }
    ];

    return items;
  };

  const validationItems = getValidationItems();
  const missingItems = validationItems.filter(item => !item.valid);
  const isAllValid = missingItems.length === 0;
  const completedCount = validationItems.filter(item => item.valid).length;
  const totalCount = validationItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Auto-sync step data to server in background
  const syncStepToServer = async () => {
    try {
      // Sync personal & bank form
      await fetch(`/api/onboarding/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'form-personal-bank',
          formData: {
            fullName: formData.fullName,
            gender: formData.gender,
            idNumber: formData.idNumber,
            birthDate: formData.birthDate,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            maritalStatus: formData.maritalStatus,
            bankName: formData.bankName,
            bankBranch: formData.bankBranch,
            accountNumber: formData.accountNumber,
            payslipConsent: formData.payslipConsent,
            idCardFile: formData.idCardFile,
            bankConfirmationFile: formData.bankConfirmationFile,
            signature: formData.signature
          }
        })
      });

      // Sync 101 form
      await fetch(`/api/onboarding/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'form-101-digital',
          formData: {
            taxYear: '2026',
            isIsraeliResident: formData.isIsraeliResident,
            otherIncomeType: formData.otherIncomeType,
            childrenUnder18Count: formData.childrenUnder18Count,
            isSingleParent: formData.isSingleParent,
            declaration101: formData.declaration101,
            signature: formData.signature
          }
        })
      });

      // Sync Police Helpless
      if (formData.policeHelplessFile) {
        await fetch(`/api/onboarding/${token}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: 'form-police-helpless',
            formData: {
              consentPoliceHelpless: formData.consentPoliceHelpless,
              policeHelplessFile: formData.policeHelplessFile,
              signature: formData.signature
            }
          })
        });
      }

      // Sync Police Sex Offenses (if male)
      if (formData.gender === 'גבר' && formData.policeSexOffenseFile) {
        await fetch(`/api/onboarding/${token}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: 'form-police-sexual-offenses',
            formData: {
              consentPoliceSexOffense: formData.consentPoliceSexOffense,
              policeSexOffenseFile: formData.policeSexOffenseFile,
              signature: formData.signature
            }
          })
        });
      }

      // Sync Health & CV
      if (formData.medicalDoctorCertFile || formData.resumeFile) {
        await fetch(`/api/onboarding/${token}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: 'form-health-and-docs',
            formData: {
              medicalFitnessStatement: formData.medicalFitnessStatement,
              medicalDoctorCertFile: formData.medicalDoctorCertFile,
              resumeFile: formData.resumeFile,
              isSocialWorker: formData.isSocialWorker,
              socialWorkerCertFile: formData.socialWorkerCertFile,
              signature: formData.signature
            }
          })
        });
      }

      // Sync Contract
      await fetch(`/api/onboarding/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'form-employment-contract',
          formData: {
            assignedApartment: formData.assignedApartment,
            agreeContractTerms: formData.agreeContractTerms,
            signature: formData.signature
          }
        })
      });

      // Sync Confidentiality
      await fetch(`/api/onboarding/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'form-confidentiality-welfare',
          formData: {
            agreeWelfareConfidentiality: formData.agreeWelfareConfidentiality,
            signature: formData.signature
          }
        })
      });

      // Sync Pension
      await fetch(`/api/onboarding/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: 'form-pension-and-tax',
          formData: {
            hasActivePension: formData.hasActivePension,
            pensionFundName: formData.pensionFundName,
            hasOtherJob: formData.hasOtherJob,
            signature: formData.signature
          }
        })
      });

    } catch (e) {
      console.warn('Background sync note:', e);
    }
  };

  // Next step click
  const handleNextStep = async () => {
    // Basic step validation before moving
    if (currentStep === 1) {
      if (!formData.fullName.trim()) {
        alert('נא להזין שם מלא');
        return;
      }
      if (!isValidIsraeliID(formData.idNumber)) {
        alert('מספר תעודת זהות אינו תקין. נא להזין 9 ספרות כולל ספרת ביקורת חוקית.');
        return;
      }
      if (!formData.phone || formData.phone.length < 9) {
        alert('נא להזין מספר טלפון נייד תקין');
        return;
      }
    }

    syncStepToServer();
    setCurrentStep(prev => Math.min(4, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Strict Submission to HR
  const handleFinalSubmitToHR = async () => {
    if (!isAllValid) {
      alert(`לא ניתן להגיש את התיק למשאבי אנוש: עדיין חסרים ${missingItems.length} שדות או מסמכי חובה.`);
      return;
    }

    try {
      setSubmitting(true);
      await syncStepToServer();

      const res = await fetch(`/api/onboarding/${token}/submit-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        throw new Error('שגיאה בהגשת התיק לשרת');
      }

      setCurrentStep(5);
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });

      if (onCompleteSubmission) {
        onCompleteSubmission();
      }
    } catch (err) {
      alert(err.message || 'שגיאה בשליחת התיק');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white animate-bounce shadow-xl shadow-indigo-200">
          <UserCheck className="w-7 h-7" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-700">טוען את פורטל הקליטה שלך...</p>
        <span className="text-xs text-slate-400 mt-1">EasyHire • פורטל קליטת עובדים</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-xl max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">קישור קליטה לא תקין או פג תוקף</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'פנה ליפעת מנהלת משאבי אנוש לקבלת קישור קליטה עדכני.'}</p>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
            >
              מעבר ללוח הבקרה
            </button>
          )}
        </div>
      </div>
    );
  }

  const { employee, company } = data;
  const isMale = formData.gender === 'גבר';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100 py-4 sm:py-8 px-3 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm mb-5 text-right relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-500" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm shadow-inner border border-indigo-100 flex-shrink-0">
                EasyHire
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-900">
                    קליטת עובד/ת • {employee.fullName || formData.fullName || 'מועמד/ת חדש/ה'}
                  </h1>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    {employee.role || 'מדריך/ת דיור'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  אודי מרילי פתרונות תעסוקה • מנהלת משאבי אנוש: <strong>{company?.hrManagerName || 'יפעת אודי מרילי'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickFillDemo}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                title="מילוי מהיר של כל הפרטים והמסמכים לצורך בדיקה והדגמה"
              >
                <Sparkles className="w-3.5 h-3.5" />
                מילוי מהיר לדוגמה
              </button>
            </div>
          </div>

          {/* Wizard Step Stepper */}
          {currentStep > 0 && currentStep < 5 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                <span>שלב {currentStep} מתוך 4</span>
                <span className={`${isAllValid ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {progressPercent}% הושלם ({completedCount}/{totalCount} פריטים)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
                <div 
                  className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold text-center">
                <button
                  onClick={() => setCurrentStep(1)}
                  className={`py-1.5 px-1 rounded-lg transition ${
                    currentStep === 1 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  1. פרטים אישיים
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  className={`py-1.5 px-1 rounded-lg transition ${
                    currentStep === 2 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  2. בנק ו-101
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className={`py-1.5 px-1 rounded-lg transition ${
                    currentStep === 3 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  3. מסמכים וחתימה
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className={`py-1.5 px-1 rounded-lg transition ${
                    currentStep === 4 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  4. בדיקה והגשה
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= STEP 0: WELCOME SCREEN ================= */}
        {currentStep === 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                ברוך/ה הבא/ה לאודי מרילי! 👋
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                אנו שמחים על הצטרפותך לצוות. פורטל <strong>EasyHire</strong> מאפשר לך להשלים את כל הליך הקליטה, מילוי טופס 101 והעלאת המסמכים בקלות ובאופן מאובטח ישירות מהסמארטפון או מהמחשב.
              </p>
            </div>

            {/* Steps Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-right space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mb-2">
                  1
                </div>
                <h4 className="text-xs font-bold text-slate-900">פרטים אישיים</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  אימות ת.ז, פרטי קשר, כתובת ומצב משפחתי.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-right space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mb-2">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-900">בנק וטופס 101</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  פרטי חשבון בנק לשכר, הצהרת 101 וקופת פנסיה.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-right space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mb-2">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-900">העלאת מסמכים</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  צילום ת"ז, אישור משטרה, אישור רפואי וחתימה דיגיטלית.
                </p>
              </div>
            </div>

            {/* Strict Validation Notice */}
            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 flex items-start gap-3 text-right">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <strong className="block mb-0.5 font-bold">שימת לב לחוק ולדרישות הקליטה:</strong>
                בהתאם לדיני העבודה ותקנות מוסדות הרווחה, תיק הקליטה יישלח למשאבי אנוש רק לאחר צירוף <strong>כל מסמכי החובה</strong> ומילוי כל הפרטים. במידה ואישור מסוים בתהליך הוצאה, תוכל/י לבקש אישור פטור זמני ישירות מיפעת בתוך הטופס.
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition"
              >
                <span>התחל מילוי טפסי הקליטה</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 1: PERSONAL INFORMATION ================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold mb-1">
                <User className="w-4 h-4" />
                <span>שלב 1 מתוך 4</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">פרטים אישיים וזיהוי</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                נא לוודא שכל הפרטים תואמים במדויק את המופיע בתעודת הזהות הרשמית שלך.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  שם מלא (פרטי ומשפחה) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  מגדר (לקביעת חובת טפסי משטרה) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                >
                  <option value="אישה">אישה</option>
                  <option value="גבר">גבר (נדרש אישור עברייני מין כחוק)</option>
                </select>
              </div>

              {/* ID Number with Israeli validation */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  מספר תעודת זהות (9 ספרות) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength="9"
                  value={formData.idNumber}
                  onChange={(e) => handleChange('idNumber', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="012345678"
                  className={`w-full text-xs p-3 rounded-xl border font-mono ${
                    formData.idNumber && !isValidIsraeliID(formData.idNumber)
                      ? 'border-rose-400 bg-rose-50/50'
                      : formData.idNumber && isValidIsraeliID(formData.idNumber)
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-slate-200 bg-slate-50'
                  } focus:bg-white focus:border-indigo-600 outline-none transition`}
                />
                {formData.idNumber && (
                  <div className="mt-1 text-[11px] font-medium">
                    {isValidIsraeliID(formData.idNumber) ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> מספר ת"ז תקין
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> ספרת ביקורת אינה תקינה (9 ספרות)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  תאריך לידה <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  טלפון נייד <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="050-1234567"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  כתובת דואר אלקטרוני (לתלוש שכר) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="israel@gmail.com"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  כתובת מגורים מלאה (עיר, רחוב ומספר בית, מיקוד) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="פייר קניג 37, ירושלים"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                />
              </div>

              {/* Marital Status */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  מצב משפחתי <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => handleChange('maritalStatus', e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                >
                  <option value="רווק/ה">רווק/ה</option>
                  <option value="נשוי/ה">נשוי/ה</option>
                  <option value="גרוש/ה">גרוש/ה</option>
                  <option value="אלמן/ה">אלמן/ה</option>
                </select>
              </div>

              {/* Assigned Apartment */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  מערך דיור / שם הדירה המשויכת
                </label>
                <input
                  type="text"
                  value={formData.assignedApartment}
                  onChange={(e) => handleChange('assignedApartment', e.target.value)}
                  placeholder="דירת בית הכרם / יד חרוצים"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={handlePrevStep}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                חזרה למבוא
              </button>

              <button
                onClick={handleNextStep}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-100 transition"
              >
                <span>המשך לשלב 2: בנק וטופס 101</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: BANKING & TAX (FORM 101 & PENSION) ================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold mb-1">
                <CreditCard className="w-4 h-4" />
                <span>שלב 2 מתוך 4</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">פרטי חשבון בנק, טופס 101 ופנסיה</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                פרטים אלו ישמשו להעברת משכורתך ולהפקדות הפנסיוניות כחוק.
              </p>
            </div>

            {/* Bank details */}
            <div className="space-y-4 text-right">
              <h3 className="text-xs font-bold text-indigo-900 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100">
                פרטי חשבון בנק להעברת שכר
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    שם הבנק <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                  >
                    <option value="בנק לאומי (10)">בנק לאומי (10)</option>
                    <option value="בנק הפועלים (12)">בנק הפועלים (12)</option>
                    <option value="בנק דיסקונט (11)">בנק דיסקונט (11)</option>
                    <option value="בנק מזרחי טפחות (20)">בנק מזרחי טפחות (20)</option>
                    <option value="הבנק הבינלאומי (31)">הבנק הבינלאומי (31)</option>
                    <option value="בנק יהב (04)">בנק יהב (04)</option>
                    <option value="בנק מסד (46)">בנק מסד (46)</option>
                    <option value="בנק מרכנתיל (17)">בנק מרכנתיל (17)</option>
                    <option value="בנק הדואר (09)">בנק הדואר (09)</option>
                    <option value="בנק וואן זירו (01)">בנק ONE ZERO (01)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    מספר סניף <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bankBranch}
                    onChange={(e) => handleChange('bankBranch', e.target.value)}
                    placeholder="למשל: 614"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    מספר חשבון בנק <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => handleChange('accountNumber', e.target.value)}
                    placeholder="למשל: 123456"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                  />
                </div>
              </div>

              {/* Digital Payslip Consent */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.payslipConsent}
                    onChange={(e) => handleChange('payslipConsent', e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed font-medium">
                    הריני מאשר/ת לקבל את תלוש השכר החודשי באמצעים אלקטרוניים (לכתובת המייל: <strong>{formData.email || 'המייל שהוזן'}</strong>). ידוע לי כי כל עוד לא ביטלתי הסכמתי בכתב, אני מוותר/ת על קבלת תלוש שכר מודפס.
                  </span>
                </label>
              </div>

              {/* Form 101 questionnaire */}
              <h3 className="text-xs font-bold text-indigo-900 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 mt-4">
                טופס 101 דיגיטלי (כרטיס עובד לשנת המס 2026 - תיק ניכויים 941707242)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">האם הינך תושב/ת ישראל כהגדרתו בפקודה?</label>
                  <select
                    value={formData.isIsraeliResident}
                    onChange={(e) => handleChange('isIsraeliResident', e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                  >
                    <option value="כן">כן - תושב/ת ישראל</option>
                    <option value="לא">לא - תושב/ת חוץ</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">הכנסות אחרות / עבודה נוספת</label>
                  <select
                    value={formData.otherIncomeType}
                    onChange={(e) => handleChange('otherIncomeType', e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                  >
                    <option value="אין לי כלל הכנסות אחרות ממשכורת או מקצבה">אין לי כלל הכנסות אחרות (משרה עיקרית)</option>
                    <option value="יש לי הכנסות נוספות - עבודה נוספת">יש לי הכנסות נוספות (נדרש תיאום מס)</option>
                    <option value="יש לי הכנסה מקצבת פרישה">הכנסה מקצבת פרישה</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">מספר ילדים שטרם מלאו להם 18 שנים</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={formData.childrenUnder18Count}
                    onChange={(e) => handleChange('childrenUnder18Count', e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">הורה יחידני / מנהל/ת משק בית בנפרד?</label>
                  <select
                    value={formData.isSingleParent}
                    onChange={(e) => handleChange('isSingleParent', e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                  >
                    <option value="לא">לא</option>
                    <option value="כן">כן - הורה יחידני</option>
                  </select>
                </div>
              </div>

              {/* Pension options */}
              <h3 className="text-xs font-bold text-indigo-900 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 mt-4">
                קופת פנסיה והסדרים פנסיוניים
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    האם קיימת על שמך קופת פנסיה פעילה? <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.hasActivePension}
                    onChange={(e) => handleChange('hasActivePension', e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                  >
                    <option value="כן - יש לי קופה פעילה (אצרף טופס קוביות)">כן - יש לי קופה פעילה (אצרף טופס קוביות/אישור קופה)</option>
                    <option value="לא - ברירת מחדל של המעסיק">לא - אני מעוניין/ת להצטרף לקרן פנסיה ברירת מחדל של המעסיק</option>
                  </select>
                </div>

                {formData.hasActivePension.includes('כן') && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      שם חברת הביטוח / קרן הפנסיה הפעילה
                    </label>
                    <input
                      type="text"
                      value={formData.pensionFundName}
                      onChange={(e) => handleChange('pensionFundName', e.target.value)}
                      placeholder="למשל: מנורה מבטחים, הראל, מגדל, מיטב, כלל, הפניקס"
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition"
                    />
                  </div>
                )}
              </div>

              {/* Form 101 Declaration Checkbox */}
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 mt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.declaration101}
                    onChange={(e) => handleChange('declaration101', e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-xs text-emerald-950 font-medium leading-relaxed">
                    <strong>הצהרת עובד:</strong> אני מצהיר/ה בזאת כי הפרטים שמסרתי לעיל הינם מלאים ונכונים. ידוע לי כי השמטה או מסירת פרטים שאינם נכונים מהווה עבירה על פקודת מס הכנסה.
                  </span>
                </label>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={handlePrevStep}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                חזרה לשלב 1
              </button>

              <button
                onClick={handleNextStep}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-100 transition"
              >
                <span>המשך לשלב 3: העלאת מסמכים</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: DOCUMENT UPLOADS & SIGNATURE ================= */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold mb-1">
                <Upload className="w-4 h-4" />
                <span>שלב 3 מתוך 4</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">העלאת מסמכי חובה וחתימה דיגיטלית</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ניתן לצלם ישירות במצלמת הטלפון הנייד או להעלות קובץ תמונה / PDF קיים.
              </p>
            </div>

            {/* Document Upload Cards */}
            <div className="space-y-4">
              
              {/* Doc 1: Teudat Zehut */}
              <DocUploadItem
                id="idCardFile"
                title="1. צילום תעודת זהות כולל ספח פתוח"
                subtitle="תעודה ביומטרית או רגילה כולל ספח מלא עם כתובת מעודכנת"
                required={true}
                fileUrl={formData.idCardFile}
                onFileSelected={(e) => handleFileUpload('idCardFile', e)}
                onUseSample={() => handleUseSampleFile('idCardFile', '/uploads/sample-id.png')}
                uploading={uploadingField === 'idCardFile'}
                waiver={getWaiverStatus('idCardFile')}
                onRequestWaiver={() => setWaiverModalField({ id: 'idCardFile', label: 'צילום תעודת זהות וספח' })}
              />

              {/* Doc 2: Bank Confirmation */}
              <DocUploadItem
                id="bankConfirmationFile"
                title="2. אסמכתת חשבון בנק"
                subtitle="צילום שיק מבוטל או אישור רשמי לניהול חשבון להעברת השכר"
                required={true}
                fileUrl={formData.bankConfirmationFile}
                onFileSelected={(e) => handleFileUpload('bankConfirmationFile', e)}
                onUseSample={() => handleUseSampleFile('bankConfirmationFile', '/uploads/sample-bank.png')}
                uploading={uploadingField === 'bankConfirmationFile'}
                waiver={getWaiverStatus('bankConfirmationFile')}
                onRequestWaiver={() => setWaiverModalField({ id: 'bankConfirmationFile', label: 'אסמכתת בנק' })}
              />

              {/* Doc 3: Police Clearance - Violence Against Helpless (Women + Men) */}
              <DocUploadItem
                id="policeHelplessFile"
                title="3. אישור משטרה - אלימות כלפי חסרי ישע (תשפ&quot;ג-2023)"
                subtitle="טופס 1 כחוק למניעת העסקה במוסדות למען חסרי ישע וילדים (חל על נשים וגברים כאחד)"
                required={true}
                fileUrl={formData.policeHelplessFile}
                onFileSelected={(e) => handleFileUpload('policeHelplessFile', e)}
                onUseSample={() => handleUseSampleFile('policeHelplessFile', '/uploads/sample-police.png')}
                uploading={uploadingField === 'policeHelplessFile'}
                waiver={getWaiverStatus('policeHelplessFile')}
                onRequestWaiver={() => setWaiverModalField({ id: 'policeHelplessFile', label: 'אישור משטרה - חסרי ישע' })}
              />

              {/* Doc 4: Police Clearance - Sexual Offenses (MEN ONLY) */}
              {isMale && (
                <DocUploadItem
                  id="policeSexOffenseFile"
                  title="4. אישור משטרה - מניעת העסקת עברייני מין (גברים בלבד)"
                  subtitle="נספח א' / טופס 1 לפי חוק מניעת העסקה של עברייני מין במוסדות מסוימים, התשס&quot;א-2001"
                  required={true}
                  badgeText="גברים בלבד כחוק"
                  fileUrl={formData.policeSexOffenseFile}
                  onFileSelected={(e) => handleFileUpload('policeSexOffenseFile', e)}
                  onUseSample={() => handleUseSampleFile('policeSexOffenseFile', '/uploads/sample-police.png')}
                  uploading={uploadingField === 'policeSexOffenseFile'}
                  waiver={getWaiverStatus('policeSexOffenseFile')}
                  onRequestWaiver={() => setWaiverModalField({ id: 'policeSexOffenseFile', label: 'אישור משטרה - עברייני מין' })}
                />
              )}

              {/* Doc 5: Medical Certificate */}
              <DocUploadItem
                id="medicalDoctorCertFile"
                title="5. אישור רפואי מרופא משפחה"
                subtitle="אישור כשירות רפואית לעבודה מאת רופא/ת המשפחה בקופת החולים"
                required={true}
                fileUrl={formData.medicalDoctorCertFile}
                onFileSelected={(e) => handleFileUpload('medicalDoctorCertFile', e)}
                onUseSample={() => handleUseSampleFile('medicalDoctorCertFile', '/uploads/sample-medical.png')}
                uploading={uploadingField === 'medicalDoctorCertFile'}
                waiver={getWaiverStatus('medicalDoctorCertFile')}
                onRequestWaiver={() => setWaiverModalField({ id: 'medicalDoctorCertFile', label: 'אישור רפואי מרופא משפחה' })}
              />

              {/* Doc 6: Resume / CV */}
              <DocUploadItem
                id="resumeFile"
                title="6. קורות חיים מעודכנים"
                subtitle="קובץ קורות חיים מעודכן בפורמט PDF, Word או תמונה"
                required={true}
                fileUrl={formData.resumeFile}
                onFileSelected={(e) => handleFileUpload('resumeFile', e)}
                onUseSample={() => handleUseSampleFile('resumeFile', '/uploads/sample-id.png')}
                uploading={uploadingField === 'resumeFile'}
                waiver={getWaiverStatus('resumeFile')}
                onRequestWaiver={() => setWaiverModalField({ id: 'resumeFile', label: 'קורות חיים' })}
              />
            </div>

            {/* Legal Declarations & Contracts */}
            <div className="space-y-3 pt-3 text-right">
              <h3 className="text-xs font-bold text-indigo-900 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100">
                הסכמים והצהרות משפטיות
              </h3>

              {/* Welfare Confidentiality */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeWelfareConfidentiality}
                    onChange={(e) => handleChange('agreeWelfareConfidentiality', e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong className="block text-slate-900 font-bold mb-0.5">
                      התחייבות לשמירת סודיות - משרד הרווחה (נספח ב'):
                    </strong>
                    הנני מתחייב/ת לשמור בסודיות מלאה ומוחלטת כל ידיעה, מסמך או פרט הנוגעים לדיירים וחוסים בפיקוח אגף דיור מוגבלויות במשרד הרווחה והביטחון החברתי (סעיף 118 לחוק העונשין).
                  </div>
                </label>
              </div>

              {/* Employment Contract */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeContractTerms}
                    onChange={(e) => handleChange('agreeContractTerms', e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong className="block text-slate-900 font-bold mb-0.5">
                      הסכם עבודה אישי וסעיף 14 לחוק פיצויי פיטורים:
                    </strong>
                    קראתי והבנתי את תנאי ההעסקה באודי מרילי פתרונות תעסוקה יצירתיים בע"מ (35.40 ₪ לשעה, הפרשות לפנסיה ולפיצויים עפ"י צו ההרחבה ונוסח הצו הכללי לפי סעיף 14, חופשה, הבראה והחזר נסיעות עפ"י חוק).
                  </div>
                </label>
              </div>
            </div>

            {/* Digital Signature Pad */}
            <div className="pt-2 text-right">
              <label className="text-xs font-bold text-slate-900 block mb-1">
                חתימה דיגיטלית של העובד/ת <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                נא לחתום באצבע על גבי מסך המגע בטלפון, או באמצעות העכבר במחשב.
              </p>
              
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <SignaturePad
                  initialSignature={formData.signature}
                  onSave={(sig) => handleChange('signature', sig)}
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={handlePrevStep}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                חזרה לשלב 2
              </button>

              <button
                onClick={handleNextStep}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-100 transition"
              >
                <span>המשך לבדיקה סופית ואישור</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: REVIEW & STRICT SUBMISSION CONTROL ================= */}
        {currentStep === 4 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold mb-1">
                <FileCheck className="w-4 h-4" />
                <span>שלב 4 מתוך 4</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">בדיקת שלמות התיק והגשה למשאבי אנוש</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                להלן צ'קליסט מלא של כל המסמכים והשדות הנדרשים. כפתור ההגשה יופעל רק לאחר השלמת 100% מהדרישות.
              </p>
            </div>

            {/* Overall status banner */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isAllValid 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isAllValid ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {isAllValid ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">
                    {isAllValid ? 'כל מסמכי החובה הושלמו במלואם!' : `נותרו ${missingItems.length} פריטים להשלמה`}
                  </h4>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {isAllValid 
                      ? 'התיק מוכן להגשה ישירה לבדיקת יפעת במשאבי אנוש.'
                      : 'לא ניתן להגיש את התיק עד להשלמת כל מסמכי החובה והפרטים.'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-black px-3 py-1 rounded-full bg-white/80 border">
                {progressPercent}%
              </span>
            </div>

            {/* Visual Checklist */}
            <div className="space-y-2 text-right">
              <h3 className="text-xs font-bold text-slate-700 mb-2">רשימת בדיקה (Checklist):</h3>
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {validationItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                      item.valid 
                        ? 'bg-emerald-50/40 border-emerald-100 text-slate-800' 
                        : 'bg-rose-50/50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.valid ? 'bg-emerald-600 text-white' : 'bg-rose-200 text-rose-700 font-bold text-[10px]'
                      }`}>
                        {item.valid ? <Check className="w-3.5 h-3.5" /> : '!'}
                      </span>
                      <div>
                        <span className="font-semibold block">{item.label}</span>
                        {item.waiver && item.waiver.status === 'approved' && (
                          <span className="text-[10px] text-emerald-600 font-bold block">
                            מאושר ע"י יפעת (פטור מאושר)
                          </span>
                        )}
                        {item.waiver && item.waiver.status === 'pending' && (
                          <span className="text-[10px] text-amber-600 font-bold block">
                            ממתין לאישור יפעת (בקשת פטור בבדיקה)
                          </span>
                        )}
                      </div>
                    </div>

                    {!item.valid && (
                      <button
                        onClick={() => setCurrentStep(item.step)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm"
                      >
                        השלם כעת
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* STRICT SUBMISSION BUTTON WITH CLEAR TOOLTIP */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              {!isAllValid ? (
                <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-medium">
                    🔒 כפתור ההגשה נעול כחוק: יש להשלים את <strong>{missingItems.length}</strong> הפריטים החסרים ברשימה מעלה.
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handlePrevStep}
                  className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  חזרה לשלב 3
                </button>

                <div className="flex-1 relative group">
                  <button
                    disabled={!isAllValid || submitting}
                    onClick={handleFinalSubmitToHR}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
                      isAllValid && !submitting
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-200 cursor-pointer animate-pulse'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Clock className="w-5 h-5 animate-spin" />
                        <span>שולח את התיק למשאבי אנוש...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>שליחת התיק לבדיקת משאבי אנוש (הגשה סופית)</span>
                      </>
                    )}
                  </button>

                  {!isAllValid && (
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2.5 bg-slate-900 text-white text-[11px] text-center rounded-xl shadow-xl pointer-events-none z-20">
                      לא ניתן להגיש: חסרים {missingItems.length} מסמכים/שדות חובה.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 5: CELEBRATORY THANK YOU SCREEN ================= */}
        {currentStep === 5 && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-200 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                התיק נשלח בהצלחה למשאבי אנוש! 🎉
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                הפרטים והמסמכים שלך נשלחו בהצלחה למשאבי אנוש לבדיקה ואישור סופי.
              </p>
            </div>

            {/* Submission Receipt Box */}
            <div className="p-4 sm:p-5 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-right max-w-md mx-auto text-xs text-emerald-950 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 font-bold">
                <span>אישור קבלת מסמכים</span>
                <span className="font-mono text-[11px] text-emerald-700">EasyHire-OK-{Date.now().toString().slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">שם העובד/ת:</span>
                <span className="font-bold">{formData.fullName || employee.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">תעודת זהות:</span>
                <span className="font-mono font-bold">{formData.idNumber || employee.idNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">תפקיד משויך:</span>
                <span className="font-bold">{employee.role || 'מדריך/ת דיור'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">סטטוס תיק:</span>
                <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  ממתין לבדיקה סופית של יפעת
                </span>
              </div>
            </div>

            {/* What's next card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-right max-w-md mx-auto text-xs text-slate-600 space-y-1">
              <strong className="text-slate-900 block font-bold">מה קורה עכשיו?</strong>
              <p className="leading-relaxed">
                יפעת מנהלת משאבי אנוש (077-5177045) תבדוק את המסמכים שהועלו (ת"ז, אישורי משטרה, חשבון בנק ואישור רפואי). ברגע שהתיק יאושר רשמית, יישלח אליך אישור סופי והעתק של כל הטפסים.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setCurrentStep(4)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
              >
                צפייה בטפסים ובקבצים שהוגשו
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ================= WAIVER REQUEST MODAL ================= */}
      {waiverModalField && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">בקשת אישור פטור / הארכה מיפעת</h3>
              </div>
              <button onClick={() => setWaiverModalField(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestWaiver} className="p-5 text-right space-y-4">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs text-amber-900">
                <strong>מסמך נדרש:</strong> {waiverModalField.label}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  נא לנמק מדוע המסמך אינו זמין כרגע ומתי צפוי להתקבל:
                </label>
                <textarea
                  rows="3"
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  placeholder="למשל: הגשתי בקשה בתחנת המשטרה בתאריך... הובטח שיהיה מוכן תוך מספר ימים..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white resize-none outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWaiverModalField(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={submittingWaiver}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
                >
                  {submittingWaiver ? 'שולח...' : 'שלח בקשה ליפעת'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Document Upload Item with Camera/Upload & Sample button
function DocUploadItem({
  id,
  title,
  subtitle,
  required,
  badgeText,
  fileUrl,
  onFileSelected,
  onUseSample,
  uploading,
  waiver,
  onRequestWaiver
}) {
  const isApproved = waiver && waiver.status === 'approved';
  const isPending = waiver && waiver.status === 'pending';

  return (
    <div className={`p-4 rounded-2xl border text-right transition ${
      fileUrl || isApproved
        ? 'bg-emerald-50/30 border-emerald-200'
        : isPending
        ? 'bg-amber-50/40 border-amber-200'
        : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h4>
            {required && <span className="text-rose-500 text-xs">*</span>}
            {badgeText && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                {badgeText}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">{subtitle}</p>
        </div>

        {/* Status Pill */}
        <div>
          {fileUrl ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              קובץ צורף בהצלחה
            </span>
          ) : isApproved ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              פטור אושר ע"י יפעת
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              ממתין לאישור יפעת
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              חובה לצרף
            </span>
          )}
        </div>
      </div>

      {/* Upload & Actions row */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* File input button */}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-sm transition">
            <Camera className="w-3.5 h-3.5" />
            <span>{fileUrl ? 'החלף קובץ / צילום' : 'צלם או בחר קובץ'}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={onFileSelected}
              disabled={uploading}
            />
          </label>

          {/* Quick sample file button for fast testing */}
          {!fileUrl && (
            <button
              type="button"
              onClick={onUseSample}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
              title="השתמש במסמך לדוגמה לצורך בדיקה מיידית"
            >
              השתמש בקובץ לדוגמה
            </button>
          )}

          {uploading && (
            <span className="text-xs text-indigo-600 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 animate-spin" /> מעלה...
            </span>
          )}
        </div>

        {/* View uploaded file or Request Waiver */}
        <div className="flex items-center gap-2">
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              צפה במסמך
            </a>
          ) : !isApproved && !isPending && (
            <button
              type="button"
              onClick={onRequestWaiver}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline"
            >
              אין לך את המסמך? בקש אישור מיפעת
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
