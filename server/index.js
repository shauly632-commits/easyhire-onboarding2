import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { store } from './data/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// ================= REAL-TIME SERVER-SENT EVENTS (SSE) =================
let sseClients = [];

export const broadcastEvent = (eventType, data, message = '') => {
  const payload = JSON.stringify({
    type: eventType,
    data,
    message,
    timestamp: new Date().toISOString()
  });
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      // client disconnected
    }
  });
};

app.get(['/api/realtime/stream', '/api/events'], (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Initial greeting
  res.write(`data: ${JSON.stringify({ 
    type: 'CONNECTED', 
    message: 'מחובר למערכת EasyHire בזמן אמת', 
    timestamp: new Date().toISOString() 
  })}\n\n`);

  // Heartbeat ping every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// ================= API ROUTES =================

// 1. Stats
app.get('/api/stats', (req, res) => {
  res.json(store.getStats());
});

// 2. Forms
app.get('/api/forms', (req, res) => {
  res.json(store.getForms());
});

app.post('/api/forms', (req, res) => {
  try {
    const newForm = store.addForm(req.body);
    res.status(201).json(newForm);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/forms/:id', (req, res) => {
  const updated = store.updateForm(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'טופס לא נמצא' });
  res.json(updated);
});

app.delete('/api/forms/:id', (req, res) => {
  const ok = store.deleteForm(req.params.id);
  res.json({ success: ok });
});

// 3. Employees & Candidates
const handleGetEmployees = (req, res) => {
  const { search, status, department } = req.query;
  let list = store.getEmployees();

  if (search) {
    const s = search.toLowerCase();
    list = list.filter(e =>
      e.fullName?.toLowerCase().includes(s) ||
      e.idNumber?.includes(s) ||
      e.phone?.includes(s) ||
      e.email?.toLowerCase().includes(s)
    );
  }

  if (status && status !== 'all') {
    list = list.filter(e => e.status === status);
  }

  if (department && department !== 'all') {
    list = list.filter(e => e.department === department);
  }

  res.json(list);
};

app.get('/api/employees', handleGetEmployees);
app.get('/api/candidates', handleGetEmployees);

const handleGetEmployeeById = (req, res) => {
  const emp = store.getEmployeeById(req.params.id);
  if (!emp) return res.status(404).json({ error: 'מועמד/עובד לא נמצא' });
  res.json(emp);
};

app.get('/api/employees/:id', handleGetEmployeeById);
app.get('/api/candidates/:id', handleGetEmployeeById);

const handleAddEmployee = (req, res) => {
  try {
    const newEmp = store.addEmployee(req.body);
    broadcastEvent('CANDIDATE_CREATED', newEmp, `נוצר קישור קליטה חדש עבור ${newEmp.fullName}`);
    res.status(201).json(newEmp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

app.post('/api/employees', handleAddEmployee);
app.post('/api/candidates', handleAddEmployee);

const handleUpdateEmployee = (req, res) => {
  const updated = store.updateEmployee(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'מועמד/עובד לא נמצא' });
  broadcastEvent('CANDIDATE_UPDATED', updated, `עודכן תיק מועמד: ${updated.fullName}`);
  res.json(updated);
};

app.patch('/api/employees/:id', handleUpdateEmployee);
app.patch('/api/candidates/:id', handleUpdateEmployee);

// Approve & Hire (Convert candidate to active employee)
const handleApproveHire = (req, res) => {
  const { notes } = req.body || {};
  const updated = store.approveHireCandidate(req.params.id, notes);
  if (!updated) return res.status(404).json({ error: 'מועמד לא נמצא' });
  broadcastEvent('CANDIDATE_APPROVED', updated, `🎉 מזל טוב! קליטת ${updated.fullName} אושרה רשמית כעובד/ת פעיל/ה!`);
  res.json({ success: true, employee: updated });
};

app.post('/api/employees/:id/approve-hire', handleApproveHire);
app.post('/api/candidates/:id/approve-hire', handleApproveHire);

// Document specific approval
app.patch(['/api/employees/:id/documents/:docKey/approval', '/api/candidates/:id/documents/:docKey/approval'], (req, res) => {
  const { isApproved, notes } = req.body;
  const updated = store.updateDocumentApproval(req.params.id, req.params.docKey, !!isApproved, notes);
  if (!updated) return res.status(404).json({ error: 'מועמד לא נמצא' });
  broadcastEvent('DOC_REVIEWED', { employeeId: req.params.id, docKey: req.params.docKey, isApproved }, `מסמך עודכן עבור ${updated.fullName}`);
  res.json({ success: true, employee: updated });
});

app.delete(['/api/employees/:id', '/api/candidates/:id'], (req, res) => {
  const ok = store.deleteEmployee(req.params.id);
  broadcastEvent('CANDIDATE_DELETED', { id: req.params.id }, 'מועמד הוסר מהמערכת');
  res.json({ success: ok });
});

// 4. Employee Onboarding Portal (Public Token Endpoint)
app.get('/api/onboarding/:token', (req, res) => {
  const emp = store.getEmployeeByToken(req.params.token);
  if (!emp) {
    return res.status(404).json({ error: 'קישור קליטה לא תקין או פג תוקף' });
  }
  // Return gender-tailored forms
  const forms = store.getForms(emp.gender);
  const waivers = store.getEmployeeWaivers(emp.id);

  res.json({
    employee: {
      id: emp.id,
      fullName: emp.fullName,
      gender: emp.gender,
      idNumber: emp.idNumber,
      phone: emp.phone,
      email: emp.email,
      role: emp.role,
      department: emp.department,
      assignedApartment: emp.assignedApartment,
      status: emp.status,
      progress: emp.progress,
      formsCount: emp.formsCount,
      completedFormsCount: emp.completedFormsCount,
      submissions: emp.submissions || {}
    },
    forms,
    waivers,
    company: store.getSettings()
  });
});

// Candidate Self-Registration (from general public link /apply)
app.post('/api/register', (req, res) => {
  try {
    const { fullName, idNumber, phone, gender, email, role, department, assignedApartment } = req.body;
    if (!fullName || !idNumber || !phone) {
      return res.status(400).json({ error: 'חובה למלא שם מלא, מספר תעודת זהות וטלפון נייד' });
    }
    const newEmp = store.registerCandidate({
      fullName,
      idNumber,
      phone,
      gender,
      email,
      role,
      department,
      assignedApartment
    });
    broadcastEvent('CANDIDATE_REGISTERED', newEmp, `מועמד/ת חדש/ה נרשם/ה: ${newEmp.fullName}`);
    res.status(201).json({
      success: true,
      token: newEmp.token,
      employee: newEmp
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Request File Waiver from Yifat
app.post('/api/onboarding/:token/request-waiver', (req, res) => {
  const { formId, fieldId, fieldName, reason } = req.body;
  if (!fieldId || !reason) {
    return res.status(400).json({ error: 'יש לציין סיבה לבקשת הפטור' });
  }
  const waiver = store.requestWaiver(req.params.token, { formId, fieldId, fieldName, reason });
  if (!waiver) {
    return res.status(404).json({ error: 'עובד לא נמצא' });
  }
  broadcastEvent('WAIVER_REQUESTED', waiver, `התקבלה בקשת אישור חדשה מ-${waiver.employeeName}: ${fieldName}`);
  res.json({ success: true, waiver });
});

// Waivers Management (HR - Yifat)
app.get('/api/waivers', (req, res) => {
  res.json(store.getWaivers());
});

app.post('/api/waivers/:id/review', (req, res) => {
  const { status, reviewerNotes } = req.body; // 'approved' or 'rejected'
  const updated = store.reviewWaiver(req.params.id, status, 'יפעת אודי מרילי');
  if (!updated) {
    return res.status(404).json({ error: 'בקשה לא נמצאה' });
  }
  broadcastEvent('WAIVER_REVIEWED', updated, `בקשת פטור עודכנה ל-${status === 'approved' ? 'אושר' : 'נדחה'}`);
  res.json({ success: true, waiver: updated });
});

// Submit Form Step
app.post('/api/onboarding/:token/submit', (req, res) => {
  const { formId, formData } = req.body;
  if (!formId || !formData) {
    return res.status(400).json({ error: 'חסרים נתוני טופס' });
  }
  const updated = store.submitEmployeeForm(req.params.token, formId, formData);
  if (!updated) {
    return res.status(404).json({ error: 'עובד לא נמצא' });
  }
  broadcastEvent('FORM_SUBMITTED', {
    employeeId: updated.id,
    fullName: updated.fullName,
    formId,
    progress: updated.progress,
    status: updated.status
  }, `המועמד/ת ${updated.fullName} השלים/ה טופס (${updated.progress}%)`);

  res.json({
    success: true,
    progress: updated.progress,
    status: updated.status,
    completedFormsCount: updated.completedFormsCount,
    formsCount: updated.formsCount
  });
});

// Submit Final Onboarding Package (Strict Validation on Server too!)
app.post('/api/onboarding/:token/submit-final', (req, res) => {
  const emp = store.getEmployeeByToken(req.params.token);
  if (!emp) {
    return res.status(404).json({ error: 'מועמד/עובד לא נמצא' });
  }

  const updated = store.submitFinalCandidatePackage(req.params.token);
  broadcastEvent('PACKAGE_SUBMITTED', updated, `🚀 המועמד/ת ${updated.fullName} הגיש/ה את כל התיק לאישור סופי!`);
  res.json({
    success: true,
    status: updated.status,
    progress: updated.progress,
    submittedAt: updated.submittedAt
  });
});

// 5. File Upload API
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'לא התקבל קובץ' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size
  });
});

// 6. Settings
app.get('/api/settings', (req, res) => {
  res.json(store.getSettings());
});

app.put('/api/settings', (req, res) => {
  const updated = store.updateSettings(req.body);
  res.json(updated);
});

// 7. CSV Export for HR & Payroll (with UTF-8 BOM for Hebrew Excel compatibility)
app.get('/api/export/csv', (req, res) => {
  const emps = store.getEmployees();
  const headers = ['מזהה', 'שם מלא', 'תעודת זהות', 'טלפון', 'אימייל', 'תפקיד', 'מחלקה', 'תאריך קליטה', 'סטטוס', 'אחוז התקדמות', 'טפסים שהושלמו', 'הערות'];
  
  const statusLabels = {
    not_started: 'טרם התחיל',
    in_progress: 'בתהליך',
    completed: 'הושלם (ממתין לאישור)',
    approved: 'אושר במלואו'
  };

  const rows = emps.map(e => [
    e.id,
    `"${e.fullName}"`,
    `="${e.idNumber}"`,
    `="${e.phone}"`,
    `"${e.email}"`,
    `"${e.role}"`,
    `"${e.department}"`,
    `"${e.hireDate}"`,
    `"${statusLabels[e.status] || e.status}"`,
    `"${e.progress}%"`,
    `"${e.completedFormsCount}/${e.formsCount}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="onboarding_employees_export.csv"');
  res.send(csvContent);
});

// Serve built frontend if available
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Onboarding Server running at http://localhost:${PORT}`);
  console.log(`📱 LAN Mobile Access ready on port ${PORT}`);
});
