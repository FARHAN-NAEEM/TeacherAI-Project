import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  FileSpreadsheet,
  Settings2,
  Download,
  CheckCircle2,
  Languages,
  Hash,
  LayoutTemplate,
  RefreshCw,
  Printer
} from 'lucide-react';

function OmrGenerator() {
  const [examTitle, setExamTitle] = useState('Weekly Assessment Test');
  const [numQuestions, setNumQuestions] = useState(100);
  const [language, setLanguage] = useState('english');
  const [includeRoll, setIncludeRoll] = useState(true);
  const [institutionName, setInstitutionName] = useState('TeacherAI Institute');

  const token = localStorage.getItem('teacherToken');

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        // Check direct field first (as used in Attendance, Payments, Settings pages)
        const name = data.instituteName || data?.data?.instituteName;
        if (name) {
          setInstitutionName(name);
        }
      })
      .catch(err => console.error("Failed to load institution profile", err));
  }, [token]);

  const getOptions = () => {
    return language === 'bangla' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'];
  };

  const toBanglaNum = (num) => {
    if (language === 'english') return num;
    const banglaDigits = { '0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯' };
    return num.toString().split('').map(d => banglaDigits[d] || d).join('');
  };

  const handleQuestionChange = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setNumQuestions('');
      return;
    }
    if (val > 100) val = 100;
    if (val < 1) val = 1;
    setNumQuestions(val);
  };

  // Strictly chunking into 4 arrays (Max 25 each)
  const generateColumns = () => {
    const total = Math.min(Number(numQuestions) || 1, 100);
    const cols = [[], [], [], []];

    for (let i = 1; i <= total; i++) {
      if (i <= 25) cols[0].push(i);
      else if (i <= 50) cols[1].push(i);
      else if (i <= 75) cols[2].push(i);
      else cols[3].push(i);
    }

    return cols;
  };

  const columns = generateColumns();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    const el = document.getElementById('omr-printable-area');
    if (!el) return;

    setIsGenerating(true);

    // Add custom class to simulate print dimensions for html2canvas
    const originalClassName = el.className;
    el.className = 'flex flex-col box-border pdf-export-mode';

    try {
      if(document.fonts) { await document.fonts.ready; }

      const canvas = await html2canvas(el, {
        scale: 3, 
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC'
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      
      pdf.save(`${examTitle.replace(/\s+/g, '_')}_OMR.pdf`);

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      el.className = originalClassName;
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* ======================= BULLETPROOF PRINT CSS ======================= */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');

          .pdf-export-mode {
            display: flex !important;
            flex-direction: column !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 15mm 12mm !important;
            margin: 0 auto !important;
            background-color: #F8FAFC !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
            top: 0 !important;
            font-family: 'Hind Siliguri', sans-serif !important;
          }

          @media print {
            @page { size: A4 portrait; margin: 0 !important; }
            
            body, html { 
              background: #F8FAFC !important; 
              margin: 0 !important; 
              padding: 0 !important; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
            
            /* Hide UI Dashboard */
            .no-print { display: none !important; }
            
            /* Enforce strict A4 size and prevent spanning across multiple pages */
            #omr-printable-area {
              display: flex !important;
              flex-direction: column !important;
              width: 210mm !important;
              height: 297mm !important;
              padding: 15mm 12mm !important;
              margin: 0 auto !important;
              background-color: #F8FAFC !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              overflow: hidden !important;
              font-family: 'Hind Siliguri', sans-serif !important;
            }
          }
        `}
      </style>

      {/* ======================= UI / DASHBOARD SECTION ======================= */}
      <div className="p-6 md:p-8 bg-[#F8FAFC] min-h-screen relative pb-24 no-print">
        <div className="max-w-[1200px] mx-auto">
          
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                 <span className="bg-indigo-600 p-2.5 rounded-xl shadow-lg">
                   <FileSpreadsheet className="text-white w-6 h-6" strokeWidth={2.5} />
                 </span>
                 Premium OMR Generator
              </h1>
              <p className="text-slate-500 font-medium mt-2 ml-12">Generate compact, perfectly aligned, high-quality Vector OMR sheets.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            <div className="xl:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-max">
               <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                 <Settings2 className="w-5 h-5 text-indigo-500"/> Sheet Configuration
               </h3>

               <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                       <LayoutTemplate className="w-3 h-3"/> Exam Title
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-slate-700 outline-none transition-all"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                       <Hash className="w-3 h-3"/> Number of Questions (Max 100)
                    </label>
                    <input 
                      type="number"
                      min="1"
                      max="100" 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-slate-700 outline-none transition-all"
                      value={numQuestions}
                      onChange={handleQuestionChange}
                      placeholder="E.g., 53"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                       <Languages className="w-3 h-3"/> Language Mode
                    </label>
                    <div className="flex gap-3">
                      <label className={`flex-1 cursor-pointer py-3 text-center rounded-xl border-2 font-bold text-sm transition-all ${language === 'bangla' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                        <input type="radio" name="lang" value="bangla" checked={language === 'bangla'} onChange={() => setLanguage('bangla')} className="hidden"/>
                        বাংলা (Bangla)
                      </label>
                      <label className={`flex-1 cursor-pointer py-3 text-center rounded-xl border-2 font-bold text-sm transition-all ${language === 'english' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                        <input type="radio" name="lang" value="english" checked={language === 'english'} onChange={() => setLanguage('english')} className="hidden"/>
                        English
                      </label>
                    </div>
                  </div>

                  <div>
                     <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                       <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${includeRoll ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-2 border-slate-300'}`}>
                         {includeRoll && <CheckCircle2 className="w-4 h-4 text-white" />}
                       </div>
                       <span className="font-bold text-sm text-slate-700">Include Roll Number Grid</span>
                       <input type="checkbox" className="hidden" checked={includeRoll} onChange={() => setIncludeRoll(!includeRoll)} />
                     </label>
                  </div>

                  <button 
                    onClick={handleDownloadPDF}
                    disabled={!numQuestions || numQuestions < 1 || isGenerating}
                    className="w-full py-4 mt-4 bg-indigo-600 text-white font-black rounded-xl text-[15px] tracking-wide shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" /> {isGenerating ? 'Generating PDF...' : 'Download Vector PDF'}
                  </button>
               </div>
            </div>

            <div className="xl:col-span-8 bg-slate-200/50 p-8 rounded-3xl border border-slate-200 flex flex-col items-center justify-center relative">
               <div className="bg-white w-[300px] h-[420px] shadow-xl rounded-sm border border-slate-300 p-6 flex flex-col relative overflow-hidden pointer-events-none opacity-80">
                  <div className="text-center border-b border-slate-300 pb-2 mb-3">
                    <h4 className="font-black text-[10px] uppercase text-slate-800 leading-tight">{institutionName}</h4>
                    <p className="text-[7px] text-slate-500 font-bold mt-1 uppercase">{examTitle}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                       <div className="h-2 bg-slate-200 rounded w-full"></div>
                       <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                       <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                    </div>
                    {includeRoll && <div className="w-12 h-16 border border-slate-300 rounded flex flex-col justify-around px-1 py-0.5">
                       {[1,2,3,4,5].map(i => <div key={i} className="flex justify-between">{[1,2,3,4].map(j => <div key={j} className="w-1.5 h-1.5 rounded-full border border-slate-300"></div>)}</div>)}
                    </div>}
                  </div>
               </div>
               <p className="mt-6 font-bold text-slate-500 text-sm flex items-center gap-2">
                 <Download className="w-4 h-4"/> Click "Download Vector PDF" and choose "Save as PDF".
               </p>
            </div>

          </div>
        </div>
      </div>

      {/* ======================= ISOLATED OMR PRINT COMPONENT ======================= */}
      {/* 🚀 Placed completely outside the dashboard wrapper to avoid flexbox collapse bugs */}
      <div 
        id="omr-printable-area" 
        className="hidden print:flex bg-[#F8FAFC] text-[#334155] font-sans box-border" 
      >
        
        {/* HEADER AREA: Title & Subtitle */}
        <div className="text-center mb-4 relative shrink-0">
          <h1 className="text-[22px] font-bold uppercase tracking-[1px] text-[#0f172a] leading-tight mb-1" style={{ letterSpacing: '1px' }}>{institutionName}</h1>
          <h2 className="text-[13px] font-medium text-[#475569] uppercase mb-2">
            {language === 'bangla' ? 'নৈর্ব্যক্তিক অভীক্ষার উত্তরপত্র' : 'OMR ANSWER SHEET'}
          </h2>
          {/* Exam title badge — premium design */}
          <div className="absolute right-0 top-0 flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-[#C7D2FE] shadow-md" style={{ maxWidth: '160px' }}>
            <div style={{ width: '4px', backgroundColor: '#6366F1', flexShrink: 0 }}></div>
            <div className="bg-[#EEF2FF] px-3 py-1.5 text-left">
              <div className="text-[8px] font-bold uppercase tracking-widest text-[#6366F1] leading-none mb-[3px]">Exam</div>
              <div className="text-[11px] font-bold text-[#1e1b4b] leading-tight">{examTitle}</div>
            </div>
          </div>
          <div className="w-full border-b-[1px] border-[#E2E8F0] mt-3"></div>
        </div>

        {/* TOP SECTION: STUDENT INFO + ROLL & SET CODE */}
        <div className="flex gap-4 mb-4 shrink-0 mt-2">
          
          <div className="flex-[2.5] bg-white border-[1.5px] border-[#CBD5E1] shadow-sm rounded-xl p-5 flex flex-col justify-between">
             <div className="flex items-end mb-3">
               <span className="w-28 text-[12px] font-medium text-[#334155]">Student Name</span><span className="mr-3 text-[#334155]">:</span>
               <div className="flex-1 border-b-[1.5px] border-dotted border-[#CBD5E1]"></div>
             </div>
             <div className="flex items-end mb-3">
               <span className="w-28 text-[12px] font-medium text-[#334155]">Student ID</span><span className="mr-3 text-[#334155]">:</span>
               <div className="flex-1 border-b-[1.5px] border-dotted border-[#CBD5E1]"></div>
             </div>
             <div className="flex items-end mb-3">
               <span className="w-28 text-[12px] font-medium text-[#334155]">Batch / Class</span><span className="mr-3 text-[#334155]">:</span>
               <div className="flex-1 border-b-[1.5px] border-dotted border-[#CBD5E1]"></div>
             </div>
             <div className="flex items-end">
               <span className="w-28 text-[12px] font-medium text-[#334155]">Subject</span><span className="mr-3 text-[#334155]">:</span>
               <div className="flex-1 border-b-[1.5px] border-dotted border-[#CBD5E1]"></div>
             </div>
          </div>

          {includeRoll && (
            <div className="border-[1.5px] border-[#EF4444] rounded-lg p-3 flex flex-col items-center shrink-0 bg-[#FEF2F2] shadow-sm">
              <div className="text-center font-bold text-[11px] mt-[6px] mb-2 uppercase tracking-[1px] text-[#DC2626]">Roll Number</div>
              <div className="flex justify-center mb-2 gap-[4px]">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-[14px] h-[18px] border-[1.2px] border-[#EF4444] rounded bg-white"></div>
                ))}
              </div>
              <div className="flex justify-center gap-[4px]">
                {[...Array(6)].map((_, col) => (
                  <div key={col} className="flex flex-col gap-[3.5px]">
                    {[0,1,2,3,4,5,6,7,8,9].map(num => (
                      <svg key={num} width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0 }}>
                        <circle cx="8" cy="8" r="7.2" fill="white" stroke="#EF4444" strokeWidth="1.2"/>
                        <text x="8" y="8" textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#EF4444" fontFamily="Hind Siliguri, sans-serif" fontWeight="600">{toBanglaNum(num)}</text>
                      </svg>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-[1.5px] border-[#3B82F6] rounded-lg p-3 flex flex-col items-center shrink-0 min-w-[75px] bg-[#EFF6FF] shadow-sm">
            <div className="text-center font-bold text-[11px] mt-1 mb-4 uppercase tracking-[1px] text-[#2563EB]">Set Code</div>
            <div className="flex flex-col gap-3 items-center flex-1 justify-center">
              {getOptions().map(opt => (
                <svg key={opt} width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                  <circle cx="10" cy="10" r="9" fill="white" stroke="#3B82F6" strokeWidth="1.5"/>
                  <text x="10" y="10" textAnchor="middle" dominantBaseline="central" fontSize="10" fill="#2563EB" fontFamily="Hind Siliguri, sans-serif" fontWeight="700">{opt}</text>
                </svg>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN OMR GRID CONTAINER */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', width: '100%', flex: 1, backgroundColor: '#F1F5F9', padding: '8px', borderRadius: '12px', border: '1.5px solid #CBD5E1', boxSizing: 'border-box' }}>
          {columns.map((col, colIndex) => (
            <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', borderRight: colIndex < 3 ? '1.5px solid #CBD5E1' : 'none', paddingRight: '6px', paddingLeft: '4px', paddingTop: '2px', paddingBottom: '2px', boxSizing: 'border-box', gap: '1px' }}>
               {col.map((num, i) => (
                 <div key={num} style={{ display: 'flex', alignItems: 'center', height: '19px', width: '100%', boxSizing: 'border-box', paddingLeft: '2px', paddingRight: '2px', borderRadius: '3px', backgroundColor: i % 2 === 0 ? 'transparent' : '#E2E8F0' }}>
                   <div style={{ width: '16px', flexShrink: 0, textAlign: 'right', fontWeight: '600', color: '#334155', fontSize: '10px', lineHeight: '19px', paddingRight: '2px' }}>{toBanglaNum(num)}.</div>
                   <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                     {getOptions().map(opt => (
                       <svg key={opt} width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0, verticalAlign: 'middle' }}>
                         <circle cx="8" cy="8" r="7" fill="white" stroke="#334155" strokeWidth="1"/>
                         <text x="8" y="8" textAnchor="middle" dominantBaseline="central" fontSize="8.5" fill="#334155" fontFamily="Hind Siliguri, sans-serif" fontWeight="700">{opt}</text>
                       </svg>
                     ))}
                   </div>
                 </div>
               ))}
            </div>
          ))}
        </div>

        {/* MARKS SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', padding: '6px 16px', marginTop: '8px', flexShrink: 0, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', gap: '32px' }}>
             <div>
               <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>প্রাপ্ত নম্বর:</div>
               <div style={{ width: '80px', borderBottom: '1.5px dotted #94A3B8' }}></div>
             </div>
             <div>
               <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>পূর্ণমান:</div>
               <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', borderBottom: '1.5px dotted #94A3B8', minWidth: '40px', textAlign: 'center' }}>{toBanglaNum(numQuestions)}</div>
             </div>
          </div>
        </div>

        {/* FOOTER SIGNATURE & RULES */}
        <div className="mt-2 pt-2 flex justify-between items-end shrink-0 box-border">
           <div className="text-[#475569] text-[10px] font-normal leading-[1.6]">
              <span className="font-semibold text-[#1E293B]">নিয়মাবলি:</span>
              <ul className="mt-1 space-y-0.5 list-disc pl-4">
                <li>বৃত্তাকার ঘরগুলো কালো বল-পয়েন্ট কলম দিয়ে সম্পূর্ণ ভরাট করতে হবে।</li>
                <li className="flex items-center gap-2">
                   <span className="flex items-center">সঠিক পদ্ধতি: <span className="inline-block w-3 h-3 bg-[#1E293B] rounded-full ml-1"></span></span>
                   <span className="flex items-center">ভুল পদ্ধতি: <span className="inline-flex items-center justify-center w-3 h-3 border-[1.2px] border-[#1E293B] rounded-full ml-1 text-[8px] pb-[1px]">x</span></span>
                </li>
                <li>উত্তরপত্রে কোনো দাগ বা ভাঁজ করা যাবে না।</li>
              </ul>
           </div>
           <div className="w-[65mm] flex flex-col justify-end text-[#64748B]">
              <div className="border-t-[1.5px] border-[#94A3B8] text-center text-[10px] font-medium pt-1.5 uppercase tracking-widest">
                Invigilator Signature
              </div>
           </div>
        </div>

      </div>
    </>
  );
}

export default OmrGenerator;