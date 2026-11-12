import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';

export default function SignaturePad({ value, onChange, label = "חתימה דיגיטלית" }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set high DPI resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e3a8a';

    // If pre-existing signature image
    if (value && value.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    if (onChange) {
      onChange(dataUrl);
    }
  };

  const clear = (e) => {
    if (e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <PenTool className="w-4 h-4 text-indigo-600" />
          <span>{label}</span>
          <span className="text-rose-500 font-bold">*</span>
        </label>
        {hasSignature && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 transition"
          >
            <RotateCcw className="w-3 h-3" />
            נקה וחתוֹם שוב
          </button>
        )}
      </div>

      <div className="relative border-2 border-dashed border-indigo-200 rounded-xl overflow-hidden bg-indigo-50/20 hover:border-indigo-400 transition touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 cursor-crosshair block"
        />

        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1">
            <span className="text-xs font-medium">חתוֹם כאן באצבע או בעכבר</span>
            <span className="text-[11px] text-slate-400">חתימה דיגיטלית מאובטחת</span>
          </div>
        )}

        {hasSignature && (
          <div className="absolute bottom-2 left-2 pointer-events-none flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50/90 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
            <Check className="w-3 h-3 text-emerald-600" />
            חתימה נקלטה בהצלחה
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mt-1">חתימתך מהווה אישור מחייב בהתאם לחוק חתימה אלקטרונית בישראל.</p>
    </div>
  );
}
