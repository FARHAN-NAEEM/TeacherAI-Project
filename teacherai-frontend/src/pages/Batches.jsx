import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Batches() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: '', fee: '', schedule: '', time: '' }); 
  const [loading, setLoading] = useState(false);

  // 🚀 New State: Schedule Conflict Warning
  const [conflictError, setConflictError] = useState({ show: false, schedule: '', time: '' });

  // Student List View এর স্টেট
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedBatchName, setSelectedBatchName] = useState('');
  const [batchStudents, setBatchStudents] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); 
  const [paymentFilter, setPaymentFilter] = useState('All'); 

  const token = localStorage.getItem('teacherToken');

  const format12Hour = (time24) => {
    if (!time24) return 'N/A';
    let [hours, minutes] = time24.split(':');
    hours = parseInt(hours);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/batches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setBatches(data.data || data);
    } catch (error) { console.error("Error fetching batches:", error); }
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleDeleteBatch = async (batchId) => {
    const confirmDelete = window.confirm("আপনি কি নিশ্চিত যে এই ব্যাচটি ডিলিট করতে চান?");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/v1/batches/${batchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setBatches(batches.filter(batch => batch._id !== batchId));
        alert("✅ সফলভাবে ডিলিট হয়েছে!");
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const openStudentList = async (batchId, batchName) => {
    setSelectedBatchName(batchName);
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/v1/batches/${batchId}/students-with-payment`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBatchStudents(data);
      setShowStudentsModal(true);
      setSearchQuery(''); setStatusFilter('All'); setPaymentFilter('All');
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🚀 Frontend Verification for Schedule Conflict
    const hasConflict = batches.some(b => 
      b.schedule.trim().toLowerCase() === newBatch.schedule.trim().toLowerCase() && 
      b.time === newBatch.time
    );

    if (hasConflict) {
      setConflictError({ show: true, schedule: newBatch.schedule, time: newBatch.time });
      return; // Stop submission
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newBatch, fee: Number(newBatch.fee) })
      });
      
      if (response.ok) {
        setNewBatch({ name: '', fee: '', schedule: '', time: '' });
        setShowForm(false);
        fetchBatches();
      } else {
        // Fallback: If backend rejects it due to conflict
        const errorData = await response.json();
        if (response.status === 400 || response.status === 409) {
          setConflictError({ show: true, schedule: newBatch.schedule, time: newBatch.time });
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const filteredStudents = batchStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || 
                          (student.status || 'Active').toLowerCase() === statusFilter.toLowerCase();
    const isPaid = ['Paid', 'Partial'].includes(student.paymentStatus);
    const matchesPayment = paymentFilter === 'All' || 
                           (paymentFilter === 'Paid' ? isPaid : !isPaid);
    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen relative">
      
      {/* 🚀 SCHEDULE CONFLICT WARNING POPUP */}
      {conflictError.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-fade-in text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>
            
            <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border-4 border-white shadow-sm">
              ⚠️
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Schedule Conflict</h3>
            <p className="text-sm font-bold text-slate-500 mb-5 leading-relaxed">
              Another batch already exists at the selected schedule.
            </p>

            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 mb-6">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Conflicting Time</p>
              <p className="text-lg font-black text-orange-600">
                {conflictError.schedule} <span className="text-orange-300 mx-1">|</span> {format12Hour(conflictError.time)}
              </p>
            </div>

            <p className="text-[11px] font-bold text-slate-400 mb-6 uppercase tracking-widest">Please choose a different day or time.</p>

            <div className="flex gap-3">
              <button 
                onClick={() => setConflictError({show: false, schedule: '', time: ''})} 
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest"
              >
                Close
              </button>
              <button 
                onClick={() => setConflictError({show: false, schedule: '', time: ''})} 
                className="flex-1 py-3.5 bg-orange-500 text-white font-black rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
              >
                Change Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Manage Batches</h1>
          <p className="text-slate-500 font-bold mt-1 tracking-tight uppercase text-[10px]">ব্যাচ এবং ফি কনফিগারেশন</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`${showForm ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-8 py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest`}
        >
          {showForm ? '✕ Cancel Creation' : '+ Add New Batch'}
        </button>
      </div>

      {/* ADD BATCH FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 mb-10 transition-all animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <input type="text" placeholder="Batch Name" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 border-2 border-transparent transition-all" required value={newBatch.name} onChange={(e) => setNewBatch({...newBatch, name: e.target.value})} />
            <input type="number" placeholder="Fee (e.g. 1000)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 border-2 border-transparent transition-all" required value={newBatch.fee} onChange={(e) => setNewBatch({...newBatch, fee: e.target.value})} />
            <input type="text" placeholder="Days (SUN-MON)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 border-2 border-transparent transition-all uppercase" required value={newBatch.schedule} onChange={(e) => setNewBatch({...newBatch, schedule: e.target.value.toUpperCase()})} />
            <input type="time" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:bg-white focus:border-blue-500 border-2 border-transparent transition-all cursor-pointer" required value={newBatch.time} onChange={(e) => setNewBatch({...newBatch, time: e.target.value})} />
            
            {/* 🚀 Changed Button Text */}
            <button type="submit" className="md:col-span-4 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              💾 Create Batch
            </button>
          </div>
        </form>
      )}

      {/* PREMIUM BATCH CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {batches.map((batch) => (
          <div key={batch._id} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group flex flex-col relative overflow-hidden">
            
            <div className="flex justify-between items-start mb-4">
              <div className="pr-4">
                <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1" title={batch.name}>
                  {batch.name}
                </h3>
              </div>
              <div className="bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 w-12 h-12 rounded-xl flex flex-col items-center justify-center border border-slate-100 group-hover:border-indigo-100 transition-colors shrink-0">
                <span className="text-lg font-black leading-none">{batch.studentCount || batch.students?.length || 0}</span>
                <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Stds</span>
              </div>
            </div>

            <div className="mb-5">
              <div className="inline-flex items-center gap-2 bg-emerald-50/80 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100/50">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Monthly Fee:</span>
                <span className="text-sm font-black">৳{batch.fee}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 mb-6 border border-slate-100">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <span className="text-base">🗓️</span>
                <span className="font-bold text-[11px] uppercase tracking-widest">{batch.schedule}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-base">🕒</span>
                <span className="font-bold text-[11px] uppercase tracking-widest">{format12Hour(batch.time)}</span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button 
                onClick={() => openStudentList(batch._id, batch.name)} 
                className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex justify-center items-center gap-1.5"
              >
                👥 View Students
              </button>
              <button 
                onClick={() => handleDeleteBatch(batch._id)} 
                className="w-11 h-11 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shrink-0"
                title="Delete Batch"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {batches.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[32px] bg-white">
            <p className="text-slate-400 font-bold text-lg">কোনো ব্যাচ পাওয়া যায়নি। নতুন ব্যাচ যোগ করুন।</p>
          </div>
        )}
      </div>

      {/* STUDENT LIST MODAL WITH NAVIGATION */}
      {showStudentsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="bg-indigo-900 p-8 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-white font-black text-2xl tracking-tight">{selectedBatchName}</h2>
                <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">Student Roster - Click on any student to view profile</p>
              </div>
              <button onClick={() => setShowStudentsModal(false)} className="text-white bg-white/10 w-10 h-10 rounded-full hover:bg-white/20 transition-all font-black">✕</button>
            </div>
            
            <div className="p-6 bg-slate-50 border-b flex flex-col md:flex-row gap-4 shrink-0">
              <input type="text" placeholder="Search by name or ID..." className="flex-1 p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <div className="flex gap-2">
                <select className="p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Deactive">Inactive</option>
                </select>
                <select className="p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                  <option value="All">Payments</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 border-b shadow-sm z-10">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name & Contact</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStudents.length > 0 ? filteredStudents.map(student => {
                    const isPaid = ['Paid', 'Partial'].includes(student.paymentStatus);
                    const isActive = (student.status || 'Active').toLowerCase() === 'active';

                    return (
                      <tr 
                        key={student._id} 
                        onClick={() => {
                          setShowStudentsModal(false);
                          navigate(`/students/${student._id}/profile`);
                        }}
                        className="hover:bg-indigo-50 transition-all cursor-pointer group"
                      >
                        <td className="px-8 py-5">
                          <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">{student.studentId}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{student.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">📞 {student.phone}</div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{isActive ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>{isPaid ? 'Paid' : 'Unpaid'}</span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="4" className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">No matching students</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t text-center shrink-0">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Count: {filteredStudents.length} Students</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Batches;