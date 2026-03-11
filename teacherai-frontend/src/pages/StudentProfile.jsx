import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// 🚀 'react-to-print' রিমুভ করা হয়েছে কারণ এখন ব্যাকএন্ড থেকে PDF আসবে
import { QRCodeSVG } from 'qrcode.react';

function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const componentRef = useRef(null); 
  
  const [profileData, setProfileData] = useState(null);
  const [monthlyAttendance, setMonthlyAttendance] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false); // 🚀 PDF ডাউনলোডের লোডিং স্টেট
  const [institutionName, setInstitutionName] = useState('ACADEMIC COACHING'); 

  const token = localStorage.getItem('teacherToken');

  // 🚀 FIX (Issue 1): Backend PDF Download Logic
  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const response = await fetch(`http://localhost:3000/api/v1/students/${id}/report`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to generate PDF report from server');

      // Response কে Blob (Binary Data) এ কনভার্ট করা হচ্ছে
      const blob = await response.blob();
      
      // Blob থেকে টেম্পোরারি URL তৈরি করা
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // ফাইলের নাম সেট করা হচ্ছে
      const fileName = `${profileData?.basicInfo?.name?.replace(/\s+/g, '_') || 'Student'}_Report.pdf`;
      link.setAttribute('download', fileName);
      
      // অটোমেটিক ডাউনলোড ট্রিগার করা
      document.body.appendChild(link);
      link.click();
      
      // মেমোরি ক্লিনআপ
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Download Error: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Profile Data
        const profileRes = await fetch(`http://localhost:3000/api/v1/students/${id}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!profileRes.ok) throw new Error('Failed to fetch student profile');
        const pData = await profileRes.json();
        setProfileData(pData);

        // 2. Fetch Monthly Attendance Summary
        const attendanceRes = await fetch(`http://localhost:3000/api/v1/attendance/student/${id}/monthly`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (attendanceRes.ok) {
          const aData = await attendanceRes.json();
          setMonthlyAttendance(aData);
        }

        // 3. Fetch Settings
        const settingsRes = await fetch('http://localhost:3000/api/v1/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData.institutionName) setInstitutionName(sData.institutionName);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    setUploading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/v1/students/${id}/upload-photo`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Photo upload failed');

      const updatedStudent = await response.json();
      setProfileData(prev => ({
        ...prev,
        basicInfo: { ...prev.basicInfo, photo: updatedStudent.photo }
      }));
      alert('Photo updated successfully! 🎉');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="text-2xl font-black text-indigo-600 animate-pulse">Loading Profile...</div></div>;
  if (error || !profileData) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50"><div className="text-2xl font-black text-rose-500 mb-4">Error: {error}</div><button onClick={() => navigate(-1)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold">Go Back</button></div>;

  const { basicInfo, summary, paymentHistory, examHistory } = profileData;
  const qrData = JSON.stringify({ studentId: basicInfo.studentId });

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen relative">
      
      {/* 🚀 Header & Print Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all font-black shadow-sm">←</button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Student Profile</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Complete overview and performance history</p>
          </div>
        </div>
        <button 
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? '⏳ GENERATING PDF...' : '🖨️ Download PDF Report'}
        </button>
      </div>

      {/* 🚀 Printable Area Starts Here (Frontend view) */}
      <div ref={componentRef} className="print:p-8 print:bg-white print:min-h-screen">
        
        {/* PDF Header (Only visible in Print) */}
        <div className="hidden print:flex items-center justify-between mb-10 border-b-4 border-indigo-900 pb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-slate-100 rounded-2xl border-2 border-indigo-100 overflow-hidden">
              {basicInfo.photo ? <img src={basicInfo.photo} alt="Student" className="w-full h-full object-cover" /> : <span className="text-4xl flex items-center justify-center h-full">🎓</span>}
            </div>
            <div>
              <h2 className="text-3xl font-black text-indigo-900 uppercase tracking-tight">{institutionName}</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Official Student Performance Report</p>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Print Date: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          
          {/* QR Code in Header */}
          <div className="text-right flex flex-col items-end">
             <div className="bg-white p-2 border-2 border-indigo-100 rounded-xl mb-2">
                <QRCodeSVG value={qrData} size={70} level="M" />
             </div>
             <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Scan to Verify</p>
          </div>
        </div>

        {/* 1. Summary Card */}
        <div className="bg-indigo-900 rounded-[32px] p-8 shadow-2xl mb-8 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center md:items-start border-4 border-indigo-950/50 print:rounded-2xl print:shadow-none print:border-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 print:hidden"></div>
          
          <div className="flex flex-col items-center shrink-0 z-10 no-print">
            <div className="w-32 h-32 bg-slate-100 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden mb-4 relative">
              {basicInfo.photo ? (
                <img src={basicInfo.photo} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">🎓</span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-indigo-400 disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>

          <div className="flex-1 text-center md:text-left z-10 w-full">
            <div className="inline-block bg-indigo-500/30 text-indigo-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-400/30 mb-3">{basicInfo.studentId}</div>
            <h2 className="text-4xl font-black text-white mb-2">{basicInfo.name}</h2>
            <p className="text-indigo-200 font-bold text-sm mb-6 flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span>📚 Batch: {basicInfo.batchId?.name || 'Unassigned'}</span>
              <span className="text-indigo-400 hidden sm:inline">•</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest border ${basicInfo.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>{basicInfo.status}</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10"><p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Attendance Rate</p><p className="text-2xl font-black text-white">{summary.attendanceRate}%</p></div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10"><p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Total Exams</p><p className="text-2xl font-black text-white">{summary.totalExams}</p></div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10"><p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Avg Marks</p><p className="text-2xl font-black text-white">{summary.averageMarks}%</p></div>
              <div className={`p-4 rounded-2xl border ${summary.currentPaymentStatus === 'Paid' ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-rose-500/20 border-rose-500/30'}`}><p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Current Month</p><p className={`text-xl font-black ${summary.currentPaymentStatus === 'Paid' ? 'text-emerald-400' : 'text-rose-400'}`}>{summary.currentPaymentStatus}</p></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block print:space-y-8">
          
          {/* Left Column */}
          <div className="space-y-8 lg:col-span-1 print:page-break-inside-avoid">
            {/* Basic Info */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 print:shadow-none print:border-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Basic Information</h3>
              <div className="space-y-4">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Phone</p><p className="text-sm font-bold text-slate-700">{basicInfo.phone}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Guardian Phone</p><p className="text-sm font-bold text-slate-700">{basicInfo.parentPhone}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admission Date</p><p className="text-sm font-bold text-slate-700">{formatDate(basicInfo.admissionDate)}</p></div>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 print:shadow-none print:border-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Payment History</h3>
              <div className="space-y-3">
                {paymentHistory.length > 0 ? paymentHistory.slice(0, 5).map(payment => (
                  <div key={payment._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                    <div><p className="font-black text-slate-800 text-sm">{payment.month}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Paid: ৳{payment.paidAmount}</p></div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${payment.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-500 border-rose-200'}`}>{payment.status}</span>
                    </div>
                  </div>
                )) : <div className="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">No payments found</div>}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8 lg:col-span-2">
            
            {/* 🚀 New Monthly Attendance Summaries */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 print:shadow-none print:border-2 print:page-break-inside-avoid">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Attendance Records</h3>
              {monthlyAttendance.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {monthlyAttendance.map((record, idx) => (
                    <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 print:bg-white">
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest text-center mb-4 border-b border-slate-200 pb-2">{record.month}</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Classes</span><span className="font-black text-slate-700">{record.totalClasses}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Present</span><span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{record.present} Days</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Absent</span><span className="font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">{record.absent} Days</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-2xl">No attendance data available</div>
              )}
            </div>

            {/* Result Section */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 print:shadow-none print:border-2 print:page-break-inside-avoid mt-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4 flex justify-between items-center">
                <span>Exam & Result History</span>
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px]">TOTAL: {examHistory.length}</span>
              </h3>
              {examHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 bg-slate-50 print:bg-slate-100">
                        <th className="py-4 px-4 rounded-tl-xl">Exam Name</th>
                        <th className="py-4 px-4 text-center">Marks</th>
                        <th className="py-4 px-4 text-center">Position</th>
                        <th className="py-4 px-4 text-center rounded-tr-xl">Medal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {examHistory.map((exam, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-all">
                          <td className="py-4 px-4"><p className="font-black text-slate-800 text-sm">{exam.examName}</p><p className="text-[10px] font-bold text-slate-400 mt-1">{formatDate(exam.examDate)}</p></td>
                          <td className="py-4 px-4 text-center font-black text-indigo-600">{exam.marks} / {exam.totalMarks}</td>
                          <td className="py-4 px-4 text-center font-black text-slate-700">{exam.batchPosition}</td>
                          <td className="py-4 px-4 text-center">
                            {exam.batchMedal === 'Gold' ? <span className="text-2xl">🥇</span> : 
                             exam.batchMedal === 'Silver' ? <span className="text-2xl">🥈</span> : 
                             exam.batchMedal === 'Bronze' ? <span className="text-2xl">🥉</span> : <span className="text-slate-300">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-slate-400 font-black uppercase tracking-widest text-xs">No exams attended yet</p></div>}
            </div>

          </div>
        </div>

        {/* 🚀 PDF Footer with Signatures (Only visible in Print) */}
        <div className="hidden print:flex justify-between items-end mt-20 pt-10 px-8 page-break-inside-avoid">
          <div className="text-center">
            <div className="w-48 border-b-2 border-slate-800 mb-2"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-600">Guardian Signature</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b-2 border-indigo-900 mb-2 pb-8"></div> 
            <p className="text-xs font-black uppercase tracking-widest text-indigo-900">Authority Signature</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{institutionName}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default StudentProfile;