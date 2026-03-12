import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  BadgeCheck, 
  Search, 
  Printer, 
  Users, 
  UserSquare2,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

function IdCards() {
  const [batches, setBatches] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  
  const [selectedBatch, setSelectedBatch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [institutionData, setInstitutionData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // 🚀 NEW: State for Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const token = localStorage.getItem('teacherToken');

  const formatImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `http://localhost:3000${url}`;
  };

  const getStudentPhoto = (student) => {
    const photoPath = student.photo || student.profilePicture || student.image || student.imageUrl || '';
    return formatImageUrl(photoPath);
  };

  const getGuardianPhone = (student) => {
    return student.guardianPhone || student.parentPhone || student.guardianNumber || student.emergencyContact || 'N/A';
  };

  const getBase64ImageFromUrl = async (imageUrl) => {
    if (!imageUrl) return null;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/batches', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setBatches(data.data || data));

    fetch('http://localhost:3000/api/v1/students', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAllStudents(data.data || data || []));

    fetch('http://localhost:3000/api/v1/auth/profile', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setInstitutionData({
          name: data.instituteName || 'Your Institution',
          address: data.address || 'Institution Address Here',
          phone: data.phone || '',
          signature: formatImageUrl(data.signature)
        });
      });
  }, [token]);

  const studentsToPrint = allStudents.filter(student => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        student.name.toLowerCase().includes(q) || 
        (student.studentId && student.studentId.toLowerCase().includes(q)) ||
        (student.roll && student.roll.toLowerCase().includes(q))
      );
    }
    if (selectedBatch) {
      const studentBatchId = student.batchId?._id || student.batchId;
      return studentBatchId === selectedBatch;
    }
    return false;
  });

  const formatDates = (dateString) => {
    const admissionDate = dateString ? new Date(dateString) : new Date();
    const expiryDate = new Date(admissionDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); 

    return {
      admission: admissionDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      expiry: expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };
  };

  // 🚀 UX: Handler to show modal before printing
  const handlePrintRequest = () => {
    if (studentsToPrint.length === 0) return;
    if (studentsToPrint.length > 1) {
      setShowConfirmModal(true);
    } else {
      generatePDF(); // Print directly if only 1 student
    }
  };

  const generatePDF = async () => {
    setShowConfirmModal(false);
    if (studentsToPrint.length === 0) return alert("প্রিন্ট করার জন্য কোনো স্টুডেন্ট পাওয়া যায়নি!");
    
    setLoading(true);
    try {
      const studentsWithImages = await Promise.all(studentsToPrint.map(async (student) => {
        const photoUrl = getStudentPhoto(student);
        const base64Photo = photoUrl ? await getBase64ImageFromUrl(photoUrl) : null;
        return { ...student, base64Photo };
      }));

      const base64Signature = institutionData.signature ? await getBase64ImageFromUrl(institutionData.signature) : null;

      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const cardW = 56; const cardH = 88; 
      const startX = 14; const startY = 14; 
      const gapX = 8; const gapY = 10; const cols = 3; 

      let currentX = startX; let currentY = startY;

      studentsWithImages.forEach((student, index) => {
        if (index > 0 && index % 9 === 0) {
          doc.addPage();
          currentX = startX; currentY = startY;
        } else if (index > 0 && index % cols === 0) {
          currentX = startX; currentY += cardH + gapY;
        } else if (index > 0) {
          currentX += cardW + gapX;
        }

        const dates = formatDates(student.admissionDate || student.createdAt);
        const batchName = batches.find(b => b._id === (student.batchId?._id || student.batchId))?.name || 'N/A';
        const guardPhone = getGuardianPhone(student);

        // Card Border & Background
        doc.setDrawColor(200, 200, 200); doc.setFillColor(255, 255, 255);
        doc.roundedRect(currentX, currentY, cardW, cardH, 2, 2, 'FD');

        // Top Header
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(currentX, currentY, cardW, 12, 2, 2, 'F');
        doc.rect(currentX, currentY + 10, cardW, 2, 'F'); 

        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        doc.text("STUDENT ID CARD", currentX + (cardW / 2), currentY + 8, { align: "center" });

        // Photo Box
        doc.setDrawColor(220, 220, 220); doc.setFillColor(245, 245, 245);
        doc.rect(currentX + 4, currentY + 16, 16, 20, 'FD');

        if (student.base64Photo) {
           try {
             const imgType = student.base64Photo.includes('image/png') ? 'PNG' : 'JPEG';
             doc.addImage(student.base64Photo, imgType, currentX + 4, currentY + 16, 16, 20);
           } catch(e) {
             doc.setFontSize(6); doc.setTextColor(150, 150, 150); doc.text("PHOTO", currentX + 12, currentY + 27, { align: "center" });
           }
        } else {
           doc.setFontSize(6); doc.setTextColor(150, 150, 150); doc.text("PHOTO", currentX + 12, currentY + 27, { align: "center" });
        }

        // Student Info
        doc.setTextColor(30, 30, 30); doc.setFontSize(7); doc.setFont("helvetica", "bold");
        let stuName = student.name || 'Unknown';
        if(stuName.length > 20) stuName = stuName.substring(0, 20) + '...';
        doc.text(stuName, currentX + 22, currentY + 19);
        
        doc.setFontSize(6); doc.setFont("helvetica", "normal");
        const infoStartX = currentX + 22; let infoY = currentY + 23; const lineH = 3.5;

        doc.text(`ID: ${student.studentId || student.roll || 'N/A'}`, infoStartX, infoY); infoY += lineH;
        doc.text(`Batch: ${batchName}`, infoStartX, infoY); infoY += lineH;
        doc.text(`Phone: ${student.phone || 'N/A'}`, infoStartX, infoY); infoY += lineH;
        doc.text(`Guard: ${guardPhone}`, infoStartX, infoY); 

        // Dates
        doc.setFont("helvetica", "bold"); doc.setTextColor(37, 99, 235);
        doc.text(`Admitted: ${dates.admission}`, currentX + 4, currentY + 41);
        doc.setTextColor(220, 38, 38);
        doc.text(`Expires: ${dates.expiry}`, currentX + 4, currentY + 45);

        // Divider
        doc.setDrawColor(220, 220, 220); doc.line(currentX + 4, currentY + 48, currentX + cardW - 4, currentY + 48);

        // Institution Info
        doc.setTextColor(30, 30, 30); doc.setFontSize(8); doc.setFont("helvetica", "bold");
        let instName = institutionData.name;
        if(instName.length > 28) instName = instName.substring(0, 28) + '...';
        doc.text(instName, currentX + (cardW / 2), currentY + 54, { align: "center" });

        if (base64Signature) {
          try {
            const sigType = base64Signature.includes('image/jpeg') ? 'JPEG' : 'PNG';
            doc.addImage(base64Signature, sigType, currentX + (cardW / 2) - 10, currentY + 56, 20, 8);
          } catch(e) {}
        } else {
            doc.setFont("helvetica", "italic"); doc.setFontSize(6); doc.setTextColor(150, 150, 150);
            doc.text("Authorized Signature", currentX + (cardW / 2), currentY + 62, { align: "center" });
        }
        
        doc.setDrawColor(100, 100, 100); doc.line(currentX + (cardW / 2) - 12, currentY + 65, currentX + (cardW / 2) + 12, currentY + 65);
        doc.setFont("helvetica", "normal"); doc.setFontSize(5); doc.setTextColor(100, 100, 100);
        doc.text("Principal / Authorized", currentX + (cardW / 2), currentY + 68, { align: "center" });

        doc.setFontSize(5); doc.setTextColor(80, 80, 80);
        doc.text("This ID card is the property of the institution.", currentX + (cardW / 2), currentY + 76, { align: "center" });
        doc.text("If found, please return to:", currentX + (cardW / 2), currentY + 79, { align: "center" });
        
        let addressStr = institutionData.address;
        if(addressStr.length > 40) addressStr = addressStr.substring(0, 40) + '...';
        doc.setFont("helvetica", "bold");
        doc.text(addressStr, currentX + (cardW / 2), currentY + 82, { align: "center" });
      });

      doc.save(`ID_Cards_${selectedBatch ? 'Batch' : 'Search'}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF জেনারেট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 UX: Reusable component for the Visual Card Preview
  const renderCardPreview = (student) => {
    return (
      <div key={student._id} className="min-w-[260px] max-w-[260px] h-[410px] bg-white rounded-xl shadow-xl border border-slate-200 relative flex flex-col transform transition-transform hover:-translate-y-1 snap-center">
         <div className="bg-blue-600 h-16 flex items-center justify-center shrink-0 rounded-t-xl">
            <h2 className="text-white font-black tracking-widest text-lg">STUDENT ID CARD</h2>
         </div>
         <div className="p-4 flex-1">
            <div className="flex gap-3 mb-4">
               <div className="w-20 h-24 bg-slate-100 border-2 border-slate-200 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {getStudentPhoto(student) ? (
                    <img src={getStudentPhoto(student)} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">PHOTO</span>
                  )}
               </div>
               <div className="flex flex-col justify-center overflow-hidden">
                  <h3 className="font-black text-slate-800 text-[15px] leading-tight mb-1 truncate">{student.name}</h3>
                  <p className="text-[10px] font-bold text-slate-500 truncate">ID: <span className="text-slate-800">{student.studentId || student.roll || 'N/A'}</span></p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">Batch: <span className="text-slate-800">{batches.find(b => b._id === (student.batchId?._id || student.batchId))?.name || 'N/A'}</span></p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">Phone: <span className="text-slate-800">{student.phone || 'N/A'}</span></p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">Guard: <span className="text-slate-800">{getGuardianPhone(student)}</span></p>
               </div>
            </div>

            <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-lg border border-blue-100 mb-4">
               <div>
                  <p className="text-[9px] font-bold text-blue-500 uppercase">Admitted</p>
                  <p className="text-xs font-black text-slate-700">{formatDates(student.admissionDate || student.createdAt).admission}</p>
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-bold text-rose-500 uppercase">Expires</p>
                  <p className="text-xs font-black text-slate-700">{formatDates(student.admissionDate || student.createdAt).expiry}</p>
               </div>
            </div>

            <hr className="border-dashed border-slate-200 mb-3" />
            <div className="text-center">
               <h4 className="font-black text-slate-800 text-[13px] mb-2 truncate px-2">{institutionData.name}</h4>
               {institutionData.signature ? (
                 <img src={institutionData.signature} alt="Sign" className="h-8 object-contain mx-auto mix-blend-multiply opacity-80" />
               ) : (
                 <div className="h-8"></div>
               )}
               <div className="w-24 h-px bg-slate-300 mx-auto mt-1 mb-1"></div>
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Principal / Authorized</p>
            </div>
         </div>
         <div className="bg-slate-50 p-2 text-center border-t border-slate-200 shrink-0 rounded-b-xl">
            <p className="text-[8px] font-bold text-slate-500 leading-tight">This ID card is the property of the institution.<br/>If found, please return to:</p>
            <p className="text-[8px] font-black text-slate-700 mt-0.5 truncate px-2">{institutionData.address}</p>
         </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 bg-[#F8FAFC] min-h-screen relative">
      
      {/* 🚀 CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden scale-in-center">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
               <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-full"><Printer className="w-6 h-6" /></div>
                 <h3 className="text-xl font-black">Confirm Print</h3>
               </div>
               <button onClick={() => setShowConfirmModal(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
               <div className="flex items-start gap-3 mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800">
                 <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                 <p className="text-sm font-semibold">You are about to generate PDF ID cards for <strong>{studentsToPrint.length}</strong> selected students. Please review the list below.</p>
               </div>
               
               <h4 className="font-bold text-slate-700 text-xs uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Selected Students</h4>
               <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                 {studentsToPrint.slice(0, 10).map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                       <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                         {getStudentPhoto(s) ? <img src={getStudentPhoto(s)} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                       </div>
                       <div className="min-w-0 flex-1">
                         <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                         <p className="text-[10px] font-semibold text-slate-500 truncate">ID: {s.studentId || s.roll}</p>
                       </div>
                    </div>
                 ))}
                 {studentsToPrint.length > 10 && (
                   <div className="text-center p-3 text-xs font-bold text-slate-500 bg-slate-50 rounded-lg">
                     + {studentsToPrint.length - 10} more students selected
                   </div>
                 )}
               </div>
               
               <div className="mt-6 flex gap-3">
                 <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                 <button onClick={generatePDF} className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2">
                   <CheckCircle2 className="w-5 h-5" /> Generate PDF
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <span className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
               <BadgeCheck className="text-white w-6 h-6" strokeWidth={2.5} />
             </span>
             Generate ID Card
          </h1>
          <p className="text-slate-500 font-medium mt-2 ml-12">Create standard student ID cards individually or batch-wise.</p>
        </div>

        {/* Filter & Controls Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-6 mb-8 items-end relative z-10">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Batch Wise Generation
            </label>
            <select 
              className="w-full h-[46px] px-4 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-slate-700 outline-none transition-all cursor-pointer shadow-sm"
              value={selectedBatch} 
              onChange={(e) => { setSelectedBatch(e.target.value); setSearchQuery(''); }} 
            >
              <option value="">Select a batch to print all...</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          
          <div className="hidden md:flex items-center justify-center font-black text-slate-300 text-sm pb-3">OR</div>

          <div className="flex-1 min-w-[250px]">
            <label className="block text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Search className="w-3 h-3" /> Single Student Generation
            </label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search by Student Name or ID..."
                className="w-full h-[46px] pl-10 pr-4 bg-blue-50/50 border border-blue-100 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-slate-800 outline-none transition-all shadow-sm"
                value={searchQuery} 
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedBatch(''); }} 
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
            </div>
          </div>

          <button 
            onClick={handlePrintRequest}
            disabled={studentsToPrint.length === 0 || loading}
            className="h-[46px] bg-slate-900 text-white px-8 rounded-xl font-bold text-[14px] shadow-lg hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full md:w-auto"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating...</>
            ) : (
              <><Printer className="w-4 h-4" /> Print {studentsToPrint.length} ID Card{studentsToPrint.length > 1 ? 's' : ''}</>
            )}
          </button>
        </div>

        {/* 🚀 NEW: Enhanced Visual Layout & Selected List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Visual Preview</h3>
                <p className="text-slate-500 text-xs mt-1">Review the selected students and card layouts.</p>
              </div>
              
              {/* 🚀 UX: Prominent Animated Badge */}
              <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border border-blue-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                </span>
                {studentsToPrint.length} Selected
              </div>
           </div>

           <div className="flex flex-col lg:flex-row min-h-[450px]">
              
              {/* 🚀 LEFT PANEL: Selected Students List */}
              <div className="w-full lg:w-1/3 xl:w-1/4 border-r border-slate-100 bg-white p-4 flex flex-col max-h-[500px]">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Student List</h4>
                 
                 {studentsToPrint.length > 0 ? (
                   <div className="overflow-y-auto custom-scrollbar pr-2 space-y-2 flex-1 pb-4">
                     {studentsToPrint.map(student => (
                       <div key={student._id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group">
                         <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 group-hover:border-blue-300 transition-colors">
                           {getStudentPhoto(student) ? (
                              <img src={getStudentPhoto(student)} className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-sm">{student.name.charAt(0)}</div>
                           )}
                         </div>
                         <div className="min-w-0 flex-1">
                           <p className="font-bold text-sm text-slate-800 truncate">{student.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 truncate">ID: {student.studentId || student.roll || 'N/A'}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50 p-4 text-center">
                     <Users className="w-12 h-12 mb-2" />
                     <p className="text-sm font-bold">List is empty</p>
                   </div>
                 )}
              </div>

              {/* 🚀 RIGHT PANEL: Multiple Cards Preview (Horizontal Scroll) */}
              <div className="w-full lg:w-2/3 xl:w-3/4 bg-slate-100/50 p-6 flex items-center overflow-x-auto custom-scrollbar snap-x snap-mandatory">
                 {studentsToPrint.length > 0 ? (
                   <div className="flex gap-8 items-center py-4 px-2 w-max">
                     {/* Show max 10 cards in preview to maintain UI performance */}
                     {studentsToPrint.slice(0, 10).map(student => renderCardPreview(student))}
                     
                     {studentsToPrint.length > 10 && (
                       <div className="min-w-[200px] h-[410px] rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-slate-50 snap-center">
                          <p className="text-4xl font-black text-slate-300">+{studentsToPrint.length - 10}</p>
                          <p className="font-bold text-sm mt-2">More Cards</p>
                          <p className="text-[10px] font-medium mt-1 px-4 text-center">Hidden in preview to save performance. Will be included in PDF.</p>
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="w-full flex flex-col items-center justify-center text-slate-400 h-full min-h-[300px]">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
                        <Search className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="font-bold text-slate-500 text-lg">No Cards to Preview</p>
                      <p className="text-sm font-medium mt-1">Select a batch or search a student.</p>
                   </div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

export default IdCards;