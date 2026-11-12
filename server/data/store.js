import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultForms, defaultEmployees, defaultCompanySettings } from './defaultData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Create sample placeholder images if not existing
const createSampleFile = (fileName, title, text) => {
  const filePath = path.join(UPLOADS_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <rect x="20" y="20" width="560" height="360" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="40" y="40" width="520" height="50" rx="6" fill="#4f46e5"/>
      <text x="300" y="72" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">${title}</text>
      <circle cx="120" cy="180" r="45" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
      <text x="120" y="186" font-family="Arial, sans-serif" font-size="13" fill="#64748b" text-anchor="middle">מסמך מקורי</text>
      <rect x="200" y="145" width="340" height="15" rx="4" fill="#cbd5e1"/>
      <rect x="200" y="175" width="280" height="15" rx="4" fill="#cbd5e1"/>
      <rect x="200" y="205" width="220" height="15" rx="4" fill="#cbd5e1"/>
      <text x="300" y="320" font-family="Arial, sans-serif" font-size="15" fill="#1e293b" text-anchor="middle">${text}</text>
      <path d="M480 300 L500 320 L540 280" stroke="#10b981" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`;
    fs.writeFileSync(filePath, svgContent, 'utf-8');
  }
};

createSampleFile('sample-id.png', 'צילום תעודת זהות וספח מאומת', 'תעודת זהות - מאומת ע"י יפעת אודי מרילי');
createSampleFile('sample-bank.png', 'אישור ניהול חשבון בנק', 'בנק ישראל - אישור ניהול חשבון להעברת שכר');
createSampleFile('sample-medical.png', 'אישור רפואי - כשירות לעבודה', 'מרפאה לרפואת משפחה - אישור כשירות מרופא');
createSampleFile('sample-police.png', 'משטרת ישראל - אישור לפי חוק', 'אישור העדר הרשעות לפי חוק המרשם הפלילי');

export class Store {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.waivers) parsed.waivers = [];
        return parsed;
      }
    } catch (e) {
      console.error('Error reading db.json:', e);
    }

    const initial = {
      forms: defaultForms,
      employees: defaultEmployees,
      settings: defaultCompanySettings,
      waivers: [
        {
          id: "waiver-sample-1",
          employeeId: "emp-102",
          employeeName: "רועי לוי",
          employeePhone: "054-6129988",
          formId: "form-police-sexual-offenses",
          fieldId: "policeSexOffenseFile",
          fieldName: "אישור משטרה - עברייני מין",
          reason: "הגשתי בקשה בתחנת המשטרה בירושלים ב-01/11, הובטח שיהיה מוכן תוך 3 ימי עסקים.",
          status: "pending",
          requestedAt: "2026-11-03 10:06",
          reviewedAt: null,
          reviewedBy: null
        }
      ]
    };
    this.save(initial);
    return initial;
  }

  save(data = this.data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      this.data = data;
    } catch (err) {
      console.error('Error writing db.json:', err);
    }
  }

  // Forms
  getForms(gender = null) {
    let list = this.data.forms;
    if (gender === 'אישה') {
      list = list.filter(f => f.targetGender !== 'male');
    }
    return list;
  }

  getFormById(id) {
    return this.data.forms.find(f => f.id === id);
  }

  addForm(form) {
    const newForm = {
      id: `form-${Date.now()}`,
      category: "טפסים מותאמים אישית",
      required: true,
      estimatedMinutes: 3,
      icon: "FileText",
      targetGender: "all",
      ...form
    };
    this.data.forms.push(newForm);
    this.recalculateAllEmployeesProgress();
    this.save();
    return newForm;
  }

  updateForm(id, updatedForm) {
    const index = this.data.forms.findIndex(f => f.id === id);
    if (index !== -1) {
      this.data.forms[index] = { ...this.data.forms[index], ...updatedForm };
      this.save();
      return this.data.forms[index];
    }
    return null;
  }

  deleteForm(id) {
    this.data.forms = this.data.forms.filter(f => f.id !== id);
    this.recalculateAllEmployeesProgress();
    this.save();
    return true;
  }

  // Employees
  getEmployees() {
    return this.data.employees;
  }

  getEmployeeById(id) {
    return this.data.employees.find(e => e.id === id);
  }

  getEmployeeByToken(token) {
    return this.data.employees.find(e => e.token === token);
  }

  addEmployee(empData) {
    const token = `tok-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const gender = empData.gender || 'אישה';
    const applicableForms = this.getForms(gender);

    const newEmp = {
      id: `emp-${Date.now()}`,
      token,
      fullName: empData.fullName || '',
      gender,
      idNumber: empData.idNumber || '',
      phone: empData.phone || '',
      email: empData.email || '',
      role: empData.role || 'מדריך/ת דיור',
      department: empData.department || 'מערך דיור - ירושלים',
      assignedApartment: empData.assignedApartment || '',
      hireDate: empData.hireDate || new Date().toISOString().split('T')[0],
      status: 'not_started',
      progress: 0,
      formsCount: applicableForms.length,
      completedFormsCount: 0,
      submittedAt: null,
      submissions: {},
      notes: empData.notes || ''
    };
    this.data.employees.unshift(newEmp);
    this.save();
    return newEmp;
  }

  // Candidate Self Registration from public link /apply
  registerCandidate(data) {
    const token = `tok-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const gender = data.gender || 'אישה';
    const applicableForms = this.getForms(gender);

    const newEmp = {
      id: `emp-${Date.now()}`,
      token,
      fullName: data.fullName?.trim() || '',
      gender,
      idNumber: data.idNumber?.trim() || '',
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      role: data.role || 'מדריך/ת דיור',
      department: data.department || 'מערך דיור - ירושלים',
      assignedApartment: data.assignedApartment || '',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      progress: 0,
      formsCount: applicableForms.length,
      completedFormsCount: 0,
      submittedAt: null,
      submissions: {
        // Pre-seed basic info into personal form
        "form-personal-bank": {
          fullName: data.fullName?.trim() || '',
          gender,
          idNumber: data.idNumber?.trim() || '',
          phone: data.phone?.trim() || '',
          email: data.email?.trim() || ''
        }
      },
      notes: 'נרשם/ה באופן עצמאי דרך קישור הקליטה'
    };

    this.data.employees.unshift(newEmp);
    this.recalculateEmployeeProgress(newEmp);
    this.save();
    return newEmp;
  }

  updateEmployee(id, updates) {
    const emp = this.data.employees.find(e => e.id === id);
    if (emp) {
      Object.assign(emp, updates);
      this.recalculateEmployeeProgress(emp);
      this.save();
      return emp;
    }
    return null;
  }

  deleteEmployee(id) {
    this.data.employees = this.data.employees.filter(e => e.id !== id);
    this.data.waivers = (this.data.waivers || []).filter(w => w.employeeId !== id);
    this.save();
    return true;
  }

  // Waivers / Exceptions Management
  getWaivers() {
    return this.data.waivers || [];
  }

  getEmployeeWaivers(employeeId) {
    return (this.data.waivers || []).filter(w => w.employeeId === employeeId);
  }

  requestWaiver(token, { formId, fieldId, fieldName, reason }) {
    const emp = this.getEmployeeByToken(token);
    if (!emp) return null;

    if (!this.data.waivers) this.data.waivers = [];

    // Check if there is already an existing waiver for this field
    const existing = this.data.waivers.find(
      w => w.employeeId === emp.id && w.fieldId === fieldId
    );

    if (existing) {
      existing.reason = reason;
      existing.status = 'pending';
      existing.requestedAt = new Date().toLocaleString('he-IL');
      this.save();
      return existing;
    }

    const waiver = {
      id: `waiver-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeePhone: emp.phone,
      formId,
      fieldId,
      fieldName,
      reason,
      status: 'pending',
      requestedAt: new Date().toLocaleString('he-IL'),
      reviewedAt: null,
      reviewedBy: null
    };

    this.data.waivers.unshift(waiver);
    this.save();
    return waiver;
  }

  reviewWaiver(waiverId, status, reviewedBy = 'יפעת אודי מרילי') {
    if (!this.data.waivers) return null;
    const w = this.data.waivers.find(item => item.id === waiverId);
    if (!w) return null;

    w.status = status; // 'approved' or 'rejected'
    w.reviewedAt = new Date().toLocaleString('he-IL');
    w.reviewedBy = reviewedBy;

    // Recalculate employee progress
    const emp = this.getEmployeeById(w.employeeId);
    if (emp) {
      this.recalculateEmployeeProgress(emp);
    }

    this.save();
    return w;
  }

  submitEmployeeForm(token, formId, formData) {
    const emp = this.data.employees.find(e => e.token === token);
    if (!emp) return null;

    if (!emp.submissions) emp.submissions = {};
    emp.submissions[formId] = {
      ...formData,
      signedAt: new Date().toLocaleString('he-IL')
    };

    // If gender is submitted in personal form, sync it
    if (formData.gender) {
      emp.gender = formData.gender;
    }

    this.recalculateEmployeeProgress(emp);
    this.save();
    return emp;
  }

  submitFinalCandidatePackage(token) {
    const emp = this.data.employees.find(e => e.token === token);
    if (!emp) return null;

    emp.status = 'completed';
    emp.submittedAt = new Date().toLocaleString('he-IL');
    emp.progress = 100;
    this.save();
    return emp;
  }

  approveHireCandidate(id, notes = '') {
    const emp = this.data.employees.find(e => e.id === id);
    if (!emp) return null;

    emp.status = 'approved';
    emp.approvedAt = new Date().toLocaleString('he-IL');
    emp.approvedBy = 'יפעת - מנהלת משאבי אנוש';
    if (notes) {
      emp.notes = emp.notes ? `${emp.notes} | ${notes}` : notes;
    }
    this.save();
    return emp;
  }

  updateDocumentApproval(employeeId, docKey, isApproved, notes = '') {
    const emp = this.data.employees.find(e => e.id === employeeId);
    if (!emp) return null;

    if (!emp.documentApprovals) {
      emp.documentApprovals = {};
    }

    emp.documentApprovals[docKey] = {
      isApproved,
      notes,
      reviewedAt: new Date().toLocaleString('he-IL'),
      reviewedBy: 'יפעת - משאבי אנוש'
    };

    this.save();
    return emp;
  }

  recalculateEmployeeProgress(emp) {
    const applicableForms = this.getForms(emp.gender);
    const total = applicableForms.length;
    emp.formsCount = total;

    // Count submitted forms
    const submittedIds = Object.keys(emp.submissions || {});
    const applicableSubmittedCount = applicableForms.filter(f => submittedIds.includes(f.id)).length;

    emp.completedFormsCount = applicableSubmittedCount;
    emp.progress = total > 0 ? Math.min(100, Math.round((applicableSubmittedCount / total) * 100)) : 0;

    if (applicableSubmittedCount >= total && total > 0) {
      if (emp.status !== 'approved') {
        emp.status = 'completed';
      }
      if (!emp.submittedAt) {
        emp.submittedAt = new Date().toLocaleString('he-IL');
      }
    } else if (applicableSubmittedCount > 0) {
      emp.status = 'in_progress';
    }
  }

  recalculateAllEmployeesProgress() {
    this.data.employees.forEach(emp => this.recalculateEmployeeProgress(emp));
  }

  getStats() {
    const emps = this.data.employees;
    const total = emps.length;
    const completed = emps.filter(e => e.status === 'completed' || e.status === 'approved').length;
    const inProgress = emps.filter(e => e.status === 'in_progress').length;
    const notStarted = emps.filter(e => e.status === 'not_started').length;
    const approved = emps.filter(e => e.status === 'approved').length;
    const pendingWaivers = (this.data.waivers || []).filter(w => w.status === 'pending').length;

    return {
      total,
      capacityTarget: this.data.settings.totalCapacity || 180,
      completed,
      inProgress,
      notStarted,
      approved,
      formsCount: this.data.forms.length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      pendingWaivers
    };
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(settings) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }
}

export const store = new Store();
