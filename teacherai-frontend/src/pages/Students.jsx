import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // 🚀 New: Search State
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // 🚀 New: Success Animation State
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  const [formData, setFormData] = useState({
    name: '', studentId: '', phone: '', parentPhone: '', batchId: '', admissionDate: new Date().toISOString().slice(0, 10)
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

  const fetchStudents = () => {
    let url = 'http://localhost:3000/api/v1/students';
    if (selectedBatch) url += `?batchId=${selectedBatch}`;

    setLoading(true);
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setStudents(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedBatch, token]);

  useEffect(() => {
    const fetchGeneratedId = async () => {
      if (!formData.batchId) {
        setFormData(prev => ({ ...prev, studentId: '' }));
        return;
      }
      
      setIsGeneratingId(true);
      try {
        const year = new Date(formData.admissionDate).getFullYear();
        const res = await fetch(`http://localhost:3000/api/v1/students/generate-id?batchId=${formData.batchId}&year=${year}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.generatedId) {
          setFormData(prev => ({ ...prev, studentId: data.generatedId }));
        }
      } catch (error) {
        console.error("ID Generation Error:", error);
      } finally {
        setIsGeneratingId(false);
      }
    };

    if (showModal) {
      fetchGeneratedId();
    }
  }, [formData.batchId, formData.admissionDate, showModal, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:3000/api/v1/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      // 🚀 New: Trigger Success Animation instead of immediate close
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowModal(false);
        setFormData({ name: '', studentId: '', phone: '', parentPhone: '', batchId: '', admissionDate: new Date().toISOString().slice(0, 10) });
        fetchStudents();
      }, 1500); // Animation stays for 1.5 seconds
    }
  };

  const toggleStatus = async (e, id, currentStatus) => {
    e.stopPropagation(); 
    const statusToCheck = (currentStatus || 'Active').toLowerCase();
    const action = statusToCheck === 'active' ? 'Deactive' : 'Active';
    
    if(window.confirm(`আপনি কি স্টুডেন্টকে ${action} করতে চান?`)) {
      const res = await fetch(`http://localhost:3000/api/v1/students/${id}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) {
        const updatedStudent = await res.json();
        setStudents(students.map(s => s._id === id ? { ...s, status: updatedStudent.status } : s));
      }
    }
  };

  const deleteStudent = async (e, id) => {
    e.stopPropagation(); 
    if (window.confirm("আপনি কি নিশ্চিত?")) {
      await fetch(`http://localhost:3000/api/v1/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStudents(students.filter(s => s._id !== id));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // 🚀 New: Filter students based on search query
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (s.phone && s.phone.includes(searchQuery))
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Students List</h1>
          <p className="text-gray-500 font-medium">আপনার সব স্টুডেন্টদের তালিকা ও ব্যবস্থাপনা</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Add New Student
        </button>
      </div>

      {/* 🚀 Updated: Search Bar & Batch Filter Section */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input 
            type="text" 
            placeholder="Search Student by Name, ID or Phone..." 
            className="w-full pl-12 pr-4 py-4 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-gray-600 bg-gray-50 transition-all placeholder:font-medium placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-gray-600 bg-gray-50 w-full md:w-64 transition-all cursor-pointer"
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
        >
          <option value="">All Batches</option>
          {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-gray-100">
            <tr>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Student ID</th>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Student Info</th>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Batch & Contact</th>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Status</th>
              <th className="p-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan="5" className="text-center p-20 font-black text-blue-600 animate-pulse text-xl">Loading Students...</td></tr>
            ) : filteredStudents.length > 0 ? filteredStudents.map(student => {
              const isStatusActive = (student.status || 'Active').toLowerCase() === 'active';
              
              return (
                <tr 
                  key={student._id} 
                  onClick={() => navigate(`/students/${student._id}/profile`)}
                  className={`transition-all hover:bg-indigo-50 cursor-pointer group ${!isStatusActive ? 'opacity-60 bg-slate-50/50' : ''}`}
                >
                  <td className="p-5">
                    <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {student.studentId || student.roll || 'N/A'}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="font-bold text-gray-800 text-lg group-hover:text-indigo-600 transition-colors">{student.name}</div>
                    <div className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                      📅 Admitted: {formatDate(student.admissionDate)}
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="font-bold text-gray-600">{student.batchId?.name || 'N/A'}</div>
                    <div className="text-xs font-bold text-gray-400 mt-1">📞 {student.phone}</div>
                  </td>
                  <td className="p-5">
                    <button 
                      onClick={(e) => toggleStatus(e, student._id, student.status)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 border ${
                        isStatusActive 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      {isStatusActive ? '🟢 Active' : '🔴 Deactive'}
                    </button>
                  </td>
                  <td className="p-5 text-right">
                    <button 
                      onClick={(e) => deleteStudent(e, student._id)} 
                      className="text-rose-500 bg-rose-50 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            }) : (
              <tr><td colSpan="5" className="p-20 text-center text-gray-400 font-bold text-lg">No students found matching your criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🚀 Updated: Premium Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl transform transition-all animate-fade-in relative overflow-hidden">
            
            {showSuccess ? (
              // 🚀 Success Animation State
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-emerald-500 text-5xl font-black">✓</span>
                </div>
                <h3 className="text-2xl font-black text-slate-800">Student Added!</h3>
                <p className="text-slate-500 font-bold mt-2">Successfully added to the database.</p>
              </div>
            ) : (
              // Form State
              <>
                <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight">নতুন স্টুডেন্ট যোগ করুন</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* --- Section 1: Basic Information --- */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Basic Information</h3>
                    
                    {/* Floating Label: Name */}
                    <div className="relative">
                      <input type="text" id="studentName" placeholder="Name" className="peer w-full px-4 pt-6 pb-2 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-800 transition-all placeholder-transparent" required autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      <label htmlFor="studentName" className="absolute left-4 top-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:capitalize peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-blue-500 pointer-events-none cursor-text">
                        স্টুডেন্টের নাম
                      </label>
                    </div>

                    {/* Batch Selection (Full Width) */}
                    <select 
                      className="w-full p-4 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-700 transition-all cursor-pointer"
                      required
                      value={formData.batchId}
                      onChange={e => setFormData({...formData, batchId: e.target.value})}
                    >
                      <option value="">ব্যাচ সিলেক্ট করুন...</option>
                      {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Floating Label: Auto ID */}
                      <div className="relative">
                        <input type="text" id="studentId" placeholder="ID" className={`peer w-full px-4 pt-6 pb-2 border-2 rounded-2xl outline-none font-bold transition-all placeholder-transparent ${formData.studentId ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'}`} readOnly required value={isGeneratingId ? "Generating..." : formData.studentId} />
                        <label htmlFor="studentId" className={`absolute left-4 top-2 text-[10px] font-black uppercase tracking-widest transition-all pointer-events-none ${formData.studentId ? 'text-indigo-400' : 'text-slate-400'}`}>
                          Student ID (Auto)
                        </label>
                      </div>

                      {/* Admission Date */}
                      <div className="relative">
                        <input type="date" id="admissionDate" className="peer w-full px-4 pt-6 pb-2 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-700 transition-all cursor-pointer placeholder-transparent" required value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                        <label htmlFor="admissionDate" className="absolute left-4 top-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all pointer-events-none">
                          Admission Date
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* --- Section 2: Contact Information --- */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 pt-2">Contact Information</h3>
                    
                    {/* Floating Label: Phone */}
                    <div className="relative">
                      <input type="text" id="phone" placeholder="Phone" className="peer w-full px-4 pt-6 pb-2 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-800 transition-all placeholder-transparent" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      <label htmlFor="phone" className="absolute left-4 top-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:capitalize peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-blue-500 pointer-events-none cursor-text">
                        স্টুডেন্টের ফোন নম্বর
                      </label>
                    </div>

                    {/* Floating Label: Parent Phone */}
                    <div className="relative">
                      <input type="text" id="parentPhone" placeholder="Parent Phone" className="peer w-full px-4 pt-6 pb-2 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-800 transition-all placeholder-transparent" required value={formData.parentPhone} onChange={e => setFormData({...formData, parentPhone: e.target.value})} />
                      <label htmlFor="parentPhone" className="absolute left-4 top-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:capitalize peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:text-blue-500 pointer-events-none cursor-text">
                        অভিভাবকের ফোন নম্বর (SMS এর জন্য)
                      </label>
                    </div>
                  </div>

                  {/* --- Action Buttons --- */}
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all uppercase tracking-widest text-[10px]">Cancel</button>
                    <button type="submit" disabled={isGeneratingId} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-widest text-[10px] disabled:bg-slate-400 disabled:shadow-none flex justify-center items-center gap-2">
                      💾 Save Student
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Students;