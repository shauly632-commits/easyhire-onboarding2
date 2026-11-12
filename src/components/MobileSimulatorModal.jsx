import React, { useState } from 'react';
import { X, Smartphone, RotateCcw, ExternalLink, QrCode, Copy, Check } from 'lucide-react';
import OnboardingPortal from './OnboardingPortal';

export default function MobileSimulatorModal({ employee, onClose, onRefresh }) {
  const [device, setDevice] = useState('iphone15'); // 'iphone15' or 'android'
  const [copied, setCopied] = useState(false);

  const token = employee?.token || 'tok-dana-789';
  const fullUrl = `${window.location.origin}/?token=${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="relative flex flex-col items-center max-w-4xl w-full">
        
        {/* Simulator Top Controls Bar */}
        <div className="w-full max-w-md bg-slate-900 text-white rounded-2xl p-3 mb-3 flex items-center justify-between border border-slate-800 shadow-xl">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="text-xs font-bold block">הדמיית מובייל לסמארטפון</span>
              <span className="text-[10px] text-slate-400">חוויית העובד/ת: {employee?.fullName || 'רועי לוי'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 border border-slate-700"
              title="העתק קישור לפתיחה בטלפון אמיתי"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'הועתק!' : 'קישור לנייד'}</span>
            </button>

            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="פתח בחלון מלא"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Smartphone Mockup Frame */}
        <div className="relative w-[375px] h-[720px] bg-black rounded-[48px] p-3 shadow-2xl border-4 border-slate-700 ring-1 ring-slate-800 overflow-hidden flex flex-col">
          
          {/* Dynamic Island / Speaker Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-slate-900 mr-8" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
          </div>

          {/* Screen Content Wrapper */}
          <div className="w-full h-full bg-white rounded-[38px] overflow-y-auto relative scrollbar-none pt-4">
            <OnboardingPortal token={token} onCompleteSubmission={onRefresh} />
          </div>

          {/* Home indicator bar */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full z-40 pointer-events-none" />
        </div>

      </div>
    </div>
  );
}
