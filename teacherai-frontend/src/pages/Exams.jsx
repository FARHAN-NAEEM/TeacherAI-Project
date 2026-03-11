import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  PencilLine, 
  Trash2, 
  BookOpen, 
  Calendar, 
  Trophy, 
  GraduationCap,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle // 🚀 Added for Upcoming Soon warning
} from 'lucide-react';

function Exams() {
  const [batches, setBatches] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({
    title: '',
    examType: 'Weekly',
    customType: '',
    totalMarks: '',
    batchId: '',
    date: new Date().toISOString().slice(0, 10)
  });

  const token = localStorage.getItem('teacherToken');

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/batches', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setBatches(data.data || data))
    .catch(err => console.error("Batch Load Error:", err));
  }, [token]);

  const fetchExams = () => {
    let url = 'http://localhost:3000/api/v1/exams';
    if (selectedBatchFilter) url += `?batchId=${selectedBatchFilter}`;

    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(data => setExams(data.data || data))
    .catch(err => console.error("Exams Load Error:", err));
  };

  useEffect(() => { fetchExams(); }, [selectedBatchFilter, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title: formData.title,
      examType: formData.examType === 'Custom' ? formData.customType : formData.examType,
      totalMarks: Number(formData.totalMarks),
      batchId: formData.batchId,
      date: formData.date
    };

    try {
      const res = await fetch('http://localhost:3000/api/v1/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMessage({ text: '✅ পরীক্ষা সফলভাবে তৈরি হয়েছে!', type: 'success' });
        setShowForm(false);
        setFormData({ ...formData, title: '', totalMarks: '' });
        fetchExams();
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (err) {
      setMessage({ text: '❌ সার্ভার এরর!', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteExam = async (id) => {
    if (!window.confirm("আপনি কি নিশ্চিত?")) return;
    await fetch(`http://localhost:3000/api/v1/exams/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchExams();
  };

  const format12Hour = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // 🚀 Stats Calculation
  const today = new Date().setHours(0,0,0,0);
  const upcomingExamsCount = exams.filter(e => new Date(e.date).getTime() >= today).length;
  const completedExamsCount = exams.filter(e => new Date(e.date).getTime() < today).length;

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        
        {/* 🚀 HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="bg-gradient-to-br from-[#4F6DF5] to-[#6C4DF6] p-2.5 rounded-[12px] shadow-lg shadow-indigo-200">
                <GraduationCap className="text-white w-6 h-6" strokeWidth={2.5} />
              </span>
              Exam Management
            </h1>
            <p className="text-slate-500 font-medium mt-1.5 text-[14px] ml-[52px]">
              Manage and evaluate student exam results
            </p>
          </div>

          <div className="flex items-center gap-4">
            <select 
              className="bg-white border border-slate-200 py-2.5 px-4 rounded-[10px] font-semibold text-slate-600 outline-none text-[14px] shadow-sm hover:border-[#4F6DF5] transition-all cursor-pointer"
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
            >
              <option value="">All Batches</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>

            <button 
              onClick={() => setShowForm(!showForm)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-[10px] font-semibold text-[14px] shadow-lg transition-all active:scale-95 ${
                showForm 
                ? 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none' 
                : 'bg-gradient-to-r from-[#4F6DF5] to-[#6C4DF6] text-white hover:shadow-indigo-300/50'
              }`}
            >
              {showForm ? 'Cancel' : <><Plus className="w-5 h-5" strokeWidth={2.5} /> Add New Exam</>}
            </button>
          </div>
        </div>

        {/* 🚀 STATS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
           <div className="bg-white p-6 rounded-[16px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                 <ClipboardList size={24} strokeWidth={2.5} />
              </div>
              <div>
                 <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Total Exams</p>
                 <h4 className="text-2xl font-black text-slate-800">{exams.length}</h4>
              </div>
           </div>
           <div className="bg-white p-6 rounded-[16px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#4F6DF5] flex items-center justify-center">
                 <Clock size={24} strokeWidth={2.5} />
              </div>
              <div>
                 <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Upcoming Exams</p>
                 <h4 className="text-2xl font-black text-slate-800">{upcomingExamsCount}</h4>
              </div>
           </div>
           <div className="bg-white p-6 rounded-[16px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                 <CheckCircle2 size={24} strokeWidth={2.5} />
              </div>
              <div>
                 <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Completed Exams</p>
                 <h4 className="text-2xl font-black text-slate-800">{completedExamsCount}</h4>
              </div>
           </div>
        </div>

        {message.text && (
          <div className="mb-8 p-4 rounded-[12px] text-center font-bold bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100 animate-in fade-in slide-in-from-top-2">
            {message.text}
          </div>
        )}

        {/* 🚀 FORM SECTION */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[16px] shadow-xl shadow-slate-200/40 border border-slate-100 mb-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-2">
                 <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Batch</label>
                 <select className="p-3.5 bg-slate-50 border border-slate-200 rounded-[10px] font-semibold text-slate-700 outline-none focus:border-[#4F6DF5] focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer" required value={formData.batchId} onChange={(e) => setFormData({...formData, batchId: e.target.value})}>
                   <option value="">Choose...</option>
                   {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                 </select>
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Exam Title</label>
                 <input type="text" placeholder="e.g. Monthly Test" className="p-3.5 bg-slate-50 border border-slate-200 rounded-[10px] outline-none font-semibold text-slate-800 focus:border-[#4F6DF5] focus:ring-4 focus:ring-indigo-50 transition-all" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Marks</label>
                 <input type="number" placeholder="100" className="p-3.5 bg-slate-50 border border-slate-200 rounded-[10px] outline-none font-semibold text-slate-800 focus:border-[#4F6DF5] focus:ring-4 focus:ring-indigo-50 transition-all" required value={formData.totalMarks} onChange={(e) => setFormData({...formData, totalMarks: e.target.value})} />
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Exam Date</label>
                 <input type="date" className="p-3.5 bg-slate-50 border border-slate-200 rounded-[10px] outline-none font-semibold text-slate-800 focus:border-[#4F6DF5] focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="lg:col-span-4 mt-2">
                 <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#4F6DF5] to-[#6C4DF6] text-white py-4 rounded-[10px] font-bold text-[14px] shadow-lg hover:shadow-indigo-300/50 transition-all active:scale-95 flex justify-center items-center gap-2">
                   {loading ? 'Processing...' : 'Save Exam Details'}
                 </button>
              </div>
            </div>
          </form>
        )}

        {/* 🚀 EXAM CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {exams.length > 0 ? exams.map((exam) => {
            
            // 🚀 Logic for Days Left Calculation
            const examMs = new Date(exam.date).setHours(0,0,0,0);
            const diffDays = Math.ceil((examMs - today) / (1000 * 60 * 60 * 24));
            const isUpcoming = diffDays >= 0;

            return (
              <div 
                key={exam._id} 
                className={`group rounded-[16px] border hover:-translate-y-1 transition-all duration-300 overflow-hidden relative flex flex-col ${
                  isUpcoming 
                  ? 'bg-indigo-50/20 border-indigo-100 shadow-[0_4px_20px_-4px_rgba(79,109,245,0.08)] hover:shadow-[0_8px_30px_-4px_rgba(79,109,245,0.15)]' 
                  : 'bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl hover:shadow-slate-200/50'
                }`}
              >
                {/* Top Colored Strip */}
                <div className={`h-1.5 w-full ${isUpcoming ? 'bg-gradient-to-r from-[#4F6DF5] to-[#6C4DF6]' : 'bg-slate-200 group-hover:bg-slate-300 transition-colors'}`}></div>
                
                <div className="p-6 flex-1 flex flex-col">
                  
                  {/* Status Badge & Marks */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      {isUpcoming ? (
                        <div className="flex items-center gap-1.5 bg-indigo-50 text-[#4F6DF5] px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4F6DF5] animate-pulse"></span>
                          Upcoming
                        </div>
                      ) : (
                         <div className="flex items-center gap-1.5 bg-slate-50 text-slate-500 px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-[8px] text-[12px] font-bold border border-slate-100 flex items-center whitespace-nowrap">
                      <Trophy className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />
                      {exam.totalMarks} <span className="font-medium ml-1">Marks</span>
                    </div>
                  </div>

                  {/* Title & Batch Info */}
                  <div className="mb-5 pr-3">
                    <h3 className={`text-[18px] font-bold leading-tight mb-2 transition-colors ${isUpcoming ? 'text-indigo-950 group-hover:text-[#4F6DF5]' : 'text-slate-800 group-hover:text-slate-600'}`}>
                      {exam.title}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-500">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span className="text-[13.5px] font-medium">{exam.batchId?.name || "N/A"}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4"></div>
                  
                  {/* Footer: Date, Days Left & Actions */}
                  <div className="flex flex-col gap-4 border-t border-slate-100/80 pt-5">
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500 text-[13px] font-semibold">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {format12Hour(exam.date)}
                      </div>
                      
                      {/* 🚀 NEW: UX Days Left Indicator */}
                      {isUpcoming && (
                        <div className="text-right">
                          {diffDays === 0 ? (
                            <span className="bg-orange-100 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-widest shadow-sm">
                              Today
                            </span>
                          ) : diffDays < 7 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" /> Upcoming Soon
                              </span>
                              <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-[4px] border border-rose-100">
                                {diffDays === 1 ? '1 Day Left' : `${diffDays} Days Left`}
                              </span>
                            </div>
                          ) : (
                            <span className="bg-indigo-50 text-[#4F6DF5] border border-indigo-100 px-2.5 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-widest">
                              {diffDays} Days Left
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1">
                      <Link 
                        to={`/exams/${exam._id}/results`} 
                        className="flex-1 bg-gradient-to-r from-[#4F6DF5] to-[#6C4DF6] text-white px-4 py-2.5 rounded-[10px] font-bold text-[13px] shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-400/50 hover:from-[#435EE0] hover:to-[#5E40E5] flex justify-center items-center transition-all active:scale-95"
                      >
                        <PencilLine className="w-4 h-4 mr-2" />
                        Enter Marks
                      </Link>
                      <button 
                        onClick={() => deleteExam(exam._id)} 
                        className="p-2.5 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-[10px] transition-all bg-white"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-24 text-center">
               <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-slate-300" />
               </div>
               <h3 className="font-bold text-slate-500 text-lg">No Exams Found</h3>
               <p className="text-slate-400 text-sm mt-1">Create a new exam to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Exams;