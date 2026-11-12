import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsCards from './components/StatsCards';
import EmployeeDashboard from './components/EmployeeDashboard';
import FormsListTab from './components/FormsListTab';
import WaiversManagerTab from './components/WaiversManagerTab';
import CandidateWizard from './components/CandidateWizard';
import CandidateRegistration from './components/CandidateRegistration';
import EmployeeDetailModal from './components/EmployeeDetailModal';
import FormBuilderModal from './components/FormBuilderModal';
import NewEmployeeModal from './components/NewEmployeeModal';
import MobileSimulatorModal from './components/MobileSimulatorModal';
import { Bell, CheckCircle2, Sparkles, X } from 'lucide-react';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  
  // Detect /onboard/:token path or ?token=...
  let initialToken = null;
  if (path.startsWith('/onboard/')) {
    initialToken = path.replace('/onboard/', '').split('/')[0].split('?')[0];
  } else if (urlParams.get('token')) {
    initialToken = urlParams.get('token');
  }

  const isApplyRoute = path.includes('/apply') || urlParams.get('mode') === 'apply';
  const isAdminForce = urlParams.get('admin') === 'true' || path.includes('/hr-dashboard');

  // State
  const [activeTab, setActiveTab] = useState(
    isApplyRoute ? 'apply' : initialToken && !isAdminForce ? 'employee-portal' : 'dashboard'
  );
  const [currentToken, setCurrentToken] = useState(initialToken);
  const [employees, setEmployees] = useState([]);
  const [forms, setForms] = useState([]);
  const [waivers, setWaivers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  // Selected modals
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [simEmployee, setSimEmployee] = useState(null);
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [isNewEmployeeOpen, setIsNewEmployeeOpen] = useState(false);

  // Active token for employee portal preview
  const [currentWorkerToken, setCurrentWorkerToken] = useState(initialToken || 'tok-roey-451');

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      const [empsRes, formsRes, statsRes, waiversRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/forms'),
        fetch('/api/stats'),
        fetch('/api/waivers')
      ]);

      if (empsRes.ok) setEmployees(await empsRes.json());
      if (formsRes.ok) setForms(await formsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (waiversRes.ok) setWaivers(await waiversRes.json());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-Time SSE Stream connection
  useEffect(() => {
    loadData();

    // Connect to Server-Sent Events stream
    let eventSource = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      
      eventSource.onopen = () => {
        setIsRealtimeConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'CONNECTED') {
            setIsRealtimeConnected(true);
          } else if (event.message) {
            setLiveToast({
              id: Date.now(),
              message: event.message,
              type: event.type
            });
            // Auto hide toast after 4.5 seconds
            setTimeout(() => setLiveToast(null), 4500);
            // Refresh data immediately
            loadData();
          }
        } catch (err) {
          console.warn('Error parsing SSE event:', err);
        }
      };

      eventSource.onerror = () => {
        setIsRealtimeConnected(false);
      };
    } catch (err) {
      console.warn('SSE not initialized:', err);
    }

    // Fallback polling every 20 seconds
    const interval = setInterval(loadData, 20000);

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, []);

  // Approve & Hire (HR officially converts candidate into active employee)
  const handleApproveHire = async (id, hrNotes = '') => {
    try {
      const res = await fetch(`/api/employees/${id}/approve-hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: hrNotes })
      });
      if (res.ok) {
        const result = await res.json();
        setEmployees(prev => prev.map(e => e.id === id ? result.employee : e));
        if (selectedEmployee?.id === id) {
          setSelectedEmployee(result.employee);
        }
        loadData();
        setLiveToast({
          id: Date.now(),
          message: `🎉 מזל טוב! קליטת ${result.employee.fullName} אושרה רשמית כעובד/ת פעיל/ה!`,
          type: 'CANDIDATE_APPROVED'
        });
      } else {
        alert('שגיאה באישור הקליטה');
      }
    } catch (err) {
      alert('שגיאה בתקשורת עם השרת');
    }
  };

  // Toggle individual document approval
  const handleToggleDocApproval = async (id, docKey, isApproved) => {
    try {
      const res = await fetch(`/api/employees/${id}/documents/${docKey}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved })
      });
      if (res.ok) {
        const result = await res.json();
        setEmployees(prev => prev.map(e => e.id === id ? result.employee : e));
        if (selectedEmployee?.id === id) {
          setSelectedEmployee(result.employee);
        }
      }
    } catch (err) {
      console.warn('Failed to update document approval:', err);
    }
  };

  // Update employee status
  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setEmployees(prev => prev.map(e => e.id === id ? updated : e));
        if (selectedEmployee?.id === id) {
          setSelectedEmployee(updated);
        }
        loadData();
      }
    } catch (err) {
      alert('שגיאה בעדכון סטטוס');
    }
  };

  // Save notes
  const handleSaveNotes = async (id, notes) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (res.ok) {
        const updated = await res.json();
        setEmployees(prev => prev.map(e => e.id === id ? updated : e));
      }
    } catch (err) {
      alert('שגיאה בשמירת הערות');
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id) => {
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEmployees(prev => prev.filter(e => e.id !== id));
        loadData();
      }
    } catch (err) {
      alert('שגיאה במחיקת עובד');
    }
  };

  // Save new employee / candidate
  const handleSaveEmployee = async (empData) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empData)
      });
      if (res.ok) {
        const created = await res.json();
        setEmployees(prev => [created, ...prev]);
        loadData();
        return created;
      }
    } catch (err) {
      alert('שגיאה ביצירת עובד');
    }
    return null;
  };

  // Review waiver (Approve/Reject)
  const handleReviewWaiver = async (waiverId, status) => {
    const res = await fetch(`/api/waivers/${waiverId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      loadData();
    } else {
      throw new Error('שגיאה בעדכון פטור');
    }
  };

  // Save new form
  const handleSaveForm = async (formData) => {
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const created = await res.json();
        setForms(prev => [...prev, created]);
        loadData();
      }
    } catch (err) {
      alert('שגיאה ביצירת טופס');
    }
  };

  // Delete form
  const handleDeleteForm = async (id) => {
    try {
      const res = await fetch(`/api/forms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setForms(prev => prev.filter(f => f.id !== id));
        loadData();
      }
    } catch (err) {
      alert('שגיאה במחיקת טופס');
    }
  };

  // 1. PUBLIC ROUTE: General Candidate Self-Registration (/apply)
  if (activeTab === 'apply') {
    return (
      <div className="min-h-screen bg-slate-50">
        <CandidateRegistration
          onRegistered={(token) => {
            setCurrentToken(token);
            setCurrentWorkerToken(token);
            setActiveTab('employee-portal');
          }}
        />
      </div>
    );
  }

  // 2. CANDIDATE PORTAL WIZARD (/onboard/:token or ?token=...)
  if (currentToken && !isAdminForce && (path.startsWith('/onboard/') || urlParams.get('token') || (activeTab === 'employee-portal' && !stats))) {
    return (
      <div className="min-h-screen bg-slate-100">
        <CandidateWizard
          token={currentToken}
          onCompleteSubmission={loadData}
          onBackToDashboard={() => {
            setCurrentToken(null);
            setActiveTab('dashboard');
          }}
        />
      </div>
    );
  }

  // 3. ADMIN / HR DASHBOARD (YIFAT)
  const pendingWaiversCount = waivers.filter(w => w.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans relative">
      
      {/* Real-time Push Notification Toast */}
      {liveToast && (
        <div className="fixed top-4 left-4 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/40 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 animate-bounce">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-indigo-400">עדכון בזמן אמת</div>
              <div className="text-xs font-semibold text-slate-100">{liveToast.message}</div>
            </div>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewEmployee={() => setIsNewEmployeeOpen(true)}
        onOpenFormBuilder={() => setIsFormBuilderOpen(true)}
        stats={stats}
        pendingWaiversCount={pendingWaiversCount}
        isRealtimeConnected={isRealtimeConnected}
      />

      {/* Mobile Mode Switcher Banner (Visible only on mobile/tablet) */}
      <div className="md:hidden bg-indigo-900 text-white p-3 px-4 flex items-center justify-between text-xs font-bold border-b border-indigo-800">
        <span>EasyHire • ניהול HR (יפעת)</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('apply')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeTab === 'apply' ? 'bg-emerald-500 text-white' : 'bg-indigo-800 text-indigo-200'
            }`}
          >
            טופס מועמד
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-indigo-800 text-indigo-200'
            }`}
          >
            לוח בקרה
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: HR DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <StatsCards stats={stats} />
            <EmployeeDashboard
              employees={employees}
              forms={forms}
              loading={loading}
              onRefresh={loadData}
              onViewEmployee={(emp) => setSelectedEmployee(emp)}
              onOpenNewEmployee={() => setIsNewEmployeeOpen(true)}
              onOpenMobileSim={(emp) => setSimEmployee(emp)}
              onDeleteEmployee={handleDeleteEmployee}
              onApproveHire={handleApproveHire}
              isRealtimeConnected={isRealtimeConnected}
            />
          </div>
        )}

        {/* TAB 2: WAIVERS & EXCEPTIONS (אישורי פטור של יפעת) */}
        {activeTab === 'waivers' && (
          <WaiversManagerTab
            waivers={waivers}
            onReviewWaiver={handleReviewWaiver}
            onRefresh={loadData}
            loading={loading}
          />
        )}

        {/* TAB 3: FORMS MANAGER */}
        {activeTab === 'forms' && (
          <FormsListTab
            forms={forms}
            onOpenFormBuilder={() => setIsFormBuilderOpen(true)}
            onDeleteForm={handleDeleteForm}
          />
        )}

        {/* TAB 4: CANDIDATE PORTAL WIZARD PREVIEW */}
        {activeTab === 'employee-portal' && (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-900">
              <span className="font-semibold">
                👤 תצוגת פורטל מועמד (Wizard) — המסך המותאם אישית שרואה המועמד בעת פתיחת הקישור המאובטח
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">החלף מועמד לבדיקה:</span>
                <select
                  value={currentWorkerToken}
                  onChange={(e) => setCurrentWorkerToken(e.target.value)}
                  className="bg-white p-1.5 rounded-xl border border-indigo-200 text-xs font-bold"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.token}>{e.fullName} ({e.progress}%)</option>
                  ))}
                </select>
              </div>
            </div>

            <CandidateWizard
              token={currentWorkerToken}
              onCompleteSubmission={loadData}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          </div>
        )}

        {/* TAB 5: MOBILE SIMULATOR */}
        {activeTab === 'mobile-sim' && (
          <div className="flex flex-col items-center justify-center py-4">
            <MobileSimulatorModal
              employee={employees[1] || employees[0]}
              onClose={() => setActiveTab('dashboard')}
              onRefresh={loadData}
            />
          </div>
        )}

      </main>

      {/* MODALS */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          forms={forms}
          onClose={() => setSelectedEmployee(null)}
          onUpdateStatus={handleUpdateStatus}
          onSaveNotes={handleSaveNotes}
          onApproveHire={handleApproveHire}
          onToggleDocApproval={handleToggleDocApproval}
        />
      )}

      {isNewEmployeeOpen && (
        <NewEmployeeModal
          onClose={() => setIsNewEmployeeOpen(false)}
          onSaveEmployee={handleSaveEmployee}
        />
      )}

      {isFormBuilderOpen && (
        <FormBuilderModal
          onClose={() => setIsFormBuilderOpen(false)}
          onSaveForm={handleSaveForm}
        />
      )}

      {simEmployee && (
        <MobileSimulatorModal
          employee={simEmployee}
          onClose={() => setSimEmployee(null)}
          onRefresh={loadData}
        />
      )}

    </div>
  );
}
