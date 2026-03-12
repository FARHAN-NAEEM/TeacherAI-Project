import { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Search, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  GraduationCap,
  Info
} from 'lucide-react';

function BatchTransfer() {
  const [batches, setBatches] = useState([]);
  const [sourceStudents, setSourceStudents] = useState([]);
  
  // Selection States
  const [sourceBatch, setSourceBatch] = useState('');
  const [targetBatch, setTargetBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // UI States
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: '' });

  const token = localStorage.getItem('teacherToken');

  // Helper for displaying images
  const getStudentPhoto = (student) => {
    const photoPath = student.photo || student.profilePicture || student.image || '';
    if (!photoPath) return '';
    if (photoPath.startsWith('http') || photoPath.startsWith('data:')) return photoPath;
    return `http://localhost:3000${photoPath}`;
  };

  // Toast Function
  const showToast = (text, type) => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: '' }), 4000);
  };

  // 1. Fetch All Batches on mount
  useEffect(() => {
    fetch('http://localhost:3000/api/v1/batches', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setBatches(data.data || data);
        setLoadingBatches(false);
      })
      .catch(err => {
        console.error(err);
        showToast("Failed to load batches", "error");
        setLoadingBatches(false);
      });
  }, [token]);

  // 2. Fetch Students when Source Batch changes
  useEffect(() => {
    if (!sourceBatch) {
      setSourceStudents([]);
      setSelectedStudent(null);
      return;
    }

    setLoadingStudents(true);
    fetch(`http://localhost:3000/api/v1/students?batchId=${sourceBatch}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSourceStudents(data.data || data || []);
        setSelectedStudent(null); // Reset selection
        setLoadingStudents(false);
      })
      .catch(err => {
        console.error(err);
        showToast("Failed to load students", "error");
        setLoadingStudents(false);
      });
  }, [sourceBatch, token]);

  // Filter students based on search query
  const filteredStudents = sourceStudents.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.name.toLowerCase().includes(q) || (s.studentId && s.studentId.toLowerCase().includes(q)));
  });

  // Target batches should exclude the selected source batch
  const availableTargetBatches = batches.filter(b => b._id !== sourceBatch);

  // 3. Handle Transfer Execution
  const executeTransfer = async () => {
    if (!selectedStudent || !targetBatch) return;
    
    setIsTransferring(true);
    try {
      const response = await fetch(`http://localhost:3000/api/v1/students/${selectedStudent._id}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newBatchId: targetBatch })
      });

      const result = await response.json();

      if (response.ok) {
        setShowConfirmModal(false);
        showToast(`Student transferred successfully. New ID: ${result.student.studentId}`, "success");
        
        // Remove the transferred student from the current UI list
        setSourceStudents(prev => prev.filter(s => s._id !== selectedStudent._id));
        setSelectedStudent(null);
        setTargetBatch('');
      } else {
        setShowConfirmModal(false);
        showToast(result.message || "Transfer failed.", "error");
      }
    } catch (err) {
      setShowConfirmModal(false);
      showToast("Server error occurred.", "error");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-[#F8FAFC] min-h-screen relative">
      
      {/* 🚀 TOAST NOTIFICATION */}
      {toast.show && (
        <div className="fixed top-8 right-8 z-50 animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-rose-500 border-rose-600 text-white'
          }`}>
            {toast.type === 'success' ? (
              <div className="bg-emerald-500/20 p-1.5 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div>
            ) : (
              <div className="bg-white/20 p-1.5 rounded-full"><X className="w-5 h-5 text-white" /></div>
            )}
            <span className="font-bold text-[14px] tracking-wide">{toast.text}</span>
          </div>
        </div>
      )}

      {/* 🚀 CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden scale-in-center">
            <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
               <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-full"><ArrowRightLeft className="w-6 h-6" /></div>
                 <h3 className="text-xl font-black">Confirm Transfer</h3>
               </div>
               <button onClick={() => setShowConfirmModal(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
               <div className="flex items-start gap-3 mb-5 bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800">
                 <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                 <p className="text-sm font-semibold">
                   Are you sure you want to transfer <strong>{selectedStudent?.name}</strong> to a new batch? A new Student ID will be generated automatically.
                 </p>
               </div>
               
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold">From:</span>
                    <span className="font-black text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                      {batches.find(b => b._id === sourceBatch)?.name}
                    </span>
                  </div>
                  <div className="flex justify-center"><ArrowRightLeft className="w-4 h-4 text-slate-300" /></div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold">To:</span>
                    <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 shadow-sm">
                      {batches.find(b => b._id === targetBatch)?.name}
                    </span>
                  </div>
               </div>
               
               <div className="flex gap-3">
                 <button onClick={() => setShowConfirmModal(false)} disabled={isTransferring} className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50">Cancel</button>
                 <button onClick={executeTransfer} disabled={isTransferring} className="flex-1 py-3 px-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                   {isTransferring ? (
                     <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Transferring...</>
                   ) : (
                     <><CheckCircle2 className="w-5 h-5" /> Confirm Transfer</>
                   )}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <span className="bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 rounded-xl shadow-lg shadow-orange-200">
               <ArrowRightLeft className="text-white w-6 h-6" strokeWidth={2.5} />
             </span>
             Batch Transfer
          </h1>
          <p className="text-slate-500 font-medium mt-2 ml-12">Move existing students between batches seamlessly. IDs are updated automatically.</p>
        </div>

        {/* 🚀 MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ================= LEFT COLUMN: SOURCE SELECTION ================= */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[650px]">
            <div className="mb-5">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 mb-4">
                <span className="bg-slate-100 text-slate-500 w-6 h-6 flex items-center justify-center rounded-full text-xs">1</span> 
                Select Source
              </h3>
              
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Current Batch</label>
              <select 
                className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 rounded-xl font-bold text-slate-700 outline-none transition-all cursor-pointer"
                value={sourceBatch} 
                onChange={(e) => setSourceBatch(e.target.value)} 
                disabled={loadingBatches}
              >
                <option value="">-- Select Source Batch --</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            {sourceBatch && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="relative mb-4 shrink-0">
                  <input 
                    type="text" 
                    placeholder="Search student by name or ID..."
                    className="w-full p-3 pl-10 bg-white border border-slate-200 focus:border-blue-500 rounded-xl font-semibold text-sm text-slate-800 outline-none transition-all shadow-sm"
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  {loadingStudents ? (
                    <div className="flex justify-center items-center h-full text-blue-500"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                      <div 
                        key={student._id} 
                        onClick={() => setSelectedStudent(student)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                          selectedStudent?._id === student._id 
                            ? 'bg-blue-50 border-blue-500 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center font-black text-slate-400">
                           {getStudentPhoto(student) ? <img src={getStudentPhoto(student)} className="w-full h-full object-cover" /> : student.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-bold text-sm truncate ${selectedStudent?._id === student._id ? 'text-blue-700' : 'text-slate-800'}`}>{student.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 truncate">ID: {student.studentId || student.roll || 'N/A'}</p>
                        </div>
                        {selectedStudent?._id === student._id && <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-70">
                      <Users className="w-10 h-10 mb-2" />
                      <p className="text-sm font-bold">No students found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {!sourceBatch && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                 <GraduationCap className="w-12 h-12 mb-3 text-slate-300" />
                 <p className="text-sm font-bold">Select a batch to view students</p>
              </div>
            )}
          </div>

          {/* ================= MIDDLE COLUMN: ARROW (Desktop only) ================= */}
          <div className="hidden lg:flex lg:col-span-2 h-[650px] items-center justify-center">
             <div className="w-16 h-16 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-300">
               <ArrowRightLeft className="w-6 h-6" />
             </div>
          </div>

          {/* ================= RIGHT COLUMN: TARGET & ACTION ================= */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[650px]">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 mb-6">
              <span className="bg-slate-100 text-slate-500 w-6 h-6 flex items-center justify-center rounded-full text-xs">2</span> 
              Target & Transfer
            </h3>

            {/* Selected Student Card */}
            <div className="mb-6">
               <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Selected Student</label>
               {selectedStudent ? (
                 <div className="bg-slate-900 p-5 rounded-2xl shadow-lg border border-slate-800 flex items-center gap-4 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 rounded-full blur-2xl opacity-20 -mr-8 -mt-8"></div>
                    <div className="w-14 h-14 rounded-full bg-slate-800 overflow-hidden shrink-0 border-2 border-slate-600 flex items-center justify-center font-black text-xl relative z-10">
                       {getStudentPhoto(selectedStudent) ? <img src={getStudentPhoto(selectedStudent)} className="w-full h-full object-cover" /> : selectedStudent.name.charAt(0)}
                    </div>
                    <div className="relative z-10 min-w-0">
                      <p className="font-black text-lg truncate leading-tight mb-1">{selectedStudent.name}</p>
                      <div className="flex gap-3 text-xs font-medium text-slate-400">
                        <span className="bg-slate-800 px-2 py-0.5 rounded">Current ID: {selectedStudent.studentId}</span>
                      </div>
                    </div>
                 </div>
               ) : (
                 <div className="h-[96px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-sm">
                    No student selected
                 </div>
               )}
            </div>

            {/* Target Batch Selection */}
            <div className="mb-6 flex-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">New Batch (Destination)</label>
              <select 
                className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 rounded-xl font-bold text-slate-700 outline-none transition-all cursor-pointer"
                value={targetBatch} 
                onChange={(e) => setTargetBatch(e.target.value)} 
                disabled={!selectedStudent}
              >
                <option value="">-- Select Target Batch --</option>
                {availableTargetBatches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
              
              {!selectedStudent && (
                <p className="text-xs font-bold text-amber-500 mt-2 flex items-center gap-1"><Info className="w-3 h-3" /> Select a student first</p>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-auto pt-4 border-t border-slate-100">
              <div className="bg-blue-50 p-4 rounded-xl text-blue-700 text-[11px] font-bold leading-relaxed border border-blue-100 mb-4">
                <strong className="block mb-1">Important Rules:</strong>
                • Admission date will remain unchanged.<br/>
                • A new serial ID will be generated based on the new batch.<br/>
                • Payment and Attendance records will shift to the new batch.
              </div>
              
              <button 
                onClick={() => setShowConfirmModal(true)}
                disabled={!selectedStudent || !targetBatch}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-xl text-[15px] tracking-wide shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-5 h-5" /> Execute Transfer
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default BatchTransfer;