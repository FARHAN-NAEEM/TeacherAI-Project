import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function Attendance() {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  
  // UX State: Focus Mode
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const token = localStorage.getItem('teacherToken');

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/batches', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setBatches(data));
  }, [token]);

  useEffect(() => {
    if (selectedBatch && date) {
      setLoading(true);
      fetch(`http://localhost:3000/api/v1/students?batchId=${selectedBatch}&activeOnly=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(studentData => {
        setStudents(studentData);
        fetch(`http://localhost:3000/api/v1/attendance/check?batchId=${selectedBatch}&date=${date}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(attData => {
          const initialAtt = {};
          studentData.forEach(s => {
            const saved = attData.find(a => a.studentId === s._id);
            initialAtt[s._id] = saved ? saved.isPresent : null; 
          });
          setAttendance(initialAtt);
          setActiveIndex(0); 
          setLoading(false);
        });
      });
    } else {
      setAttendanceMode(false);
    }
  }, [selectedBatch, date, token]);

  // Keyboard Shortcut Logic
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!attendanceMode) return; 
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (students.length === 0) return;

      const activeStudent = students[activeIndex];
      if (!activeStudent) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleMark(activeStudent._id, true);
        setActiveIndex(prev => Math.min(prev + 1, students.length - 1));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleMark(activeStudent._id, false);
        setActiveIndex(prev => Math.min(prev + 1, students.length - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, students.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [students, activeIndex, attendanceMode]);

  const handleMark = (id, status) => {
    setAttendance(prev => ({ ...prev, [id]: status }));
  };

  const saveAttendance = async () => {
    const payload = Object.keys(attendance).map(sId => ({
      studentId: sId,
      batchId: selectedBatch,
      date: date,
      isPresent: attendance[sId] === true ? true : false 
    }));

    const res = await fetch('http://localhost:3000/api/v1/attendance/take', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("হাজিরা সফলভাবে ডাটাবেসে সংরক্ষিত হয়েছে!");
        setAttendanceMode(false); 
    }
  };

  // ==========================================
  // PREMIUM PDF GENERATION LOGIC
  // ==========================================
  const downloadPDF = async () => {
    if (!selectedBatch) return alert("আগে ব্যাচ সিলেক্ট করুন!");
    
    try {
      let profile = { instituteName: "Attendance Report", signature: null };
      
      try {
        const res = await fetch('http://localhost:3000/api/v1/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.instituteName) profile.instituteName = data.instituteName;
          if (data.signature) profile.signature = data.signature; // Fetching actual signature
        }
      } catch (profileErr) {
        console.warn("Profile not found");
      }
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const batchName = batches.find(b => b._id === selectedBatch)?.name || 'Batch';

      // --- 1. Header Section ---
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138); // Dark Premium Blue
      doc.text(profile.instituteName, 14, 22);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235); // Light Blue Subtitle
      doc.text("DAILY ATTENDANCE REPORT", 14, 30);

      // Header Right Side (Batch & Date Info)
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(`Batch: ${batchName}`, 196, 20, { align: 'right' });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const displayDate = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.text(`Date: ${displayDate}`, 196, 25, { align: 'right' });
      
      const generatedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`Generated: ${generatedDate}`, 196, 30, { align: 'right' });

      // --- 2. Summary Boxes ---
      const total = students.length;
      const presentCount = Object.values(attendance).filter(v => v === true).length;
      const absentCount = Object.values(attendance).filter(v => v === false).length;

      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(252, 252, 252);
      // Drawing 3 boxes
      doc.roundedRect(14, 38, 55, 20, 2, 2, 'FD');
      doc.roundedRect(77, 38, 55, 20, 2, 2, 'FD');
      doc.roundedRect(140, 38, 56, 20, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Total Students", 41.5, 45, { align: 'center' });
      doc.text("Total Present", 104.5, 45, { align: 'center' });
      doc.text("Total Absent", 168, 45, { align: 'center' });

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(`${total}`, 41.5, 53, { align: 'center' });
      doc.text(`${presentCount}`, 104.5, 53, { align: 'center' });
      doc.text(`${absentCount}`, 168, 53, { align: 'center' });

      // --- 3. Premium Table ---
      const tableRows = students.map((s, idx) => [
        idx + 1,
        s.studentId || s.roll, // Updated Roll to Student ID
        s.name,
        attendance[s._id] === true ? 'Present' : attendance[s._id] === false ? 'Absent' : 'Not Marked'
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Rank', 'Student ID', 'Student Name', 'Status']],
        body: tableRows,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246], // Premium Blue 
          textColor: 255, 
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [50, 50, 50],
          halign: 'center',
          valign: 'middle'
        },
        alternateRowStyles: { 
          fillColor: [255, 253, 235] // Light yellow tint exactly like your reference
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          2: { halign: 'left', fontStyle: 'bold' }, 
          3: { fontStyle: 'bold' }
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 3) {
            // Text Color based on Status
            if (data.cell.raw === 'Present') {
              data.cell.styles.textColor = [16, 185, 129]; // Emerald Green
            } else if (data.cell.raw === 'Absent') {
              data.cell.styles.textColor = [239, 68, 68]; // Rose Red
            }
          }
        }
      });

      // --- 4. Footer & Authorized Signature ---
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 30 : 150;
      
      // Placing the Signature Image if it exists
      if (profile.signature) {
        try {
          // Identify image format (JPEG or PNG)
          let imgFormat = 'PNG';
          if(profile.signature.includes('jpeg') || profile.signature.includes('jpg')) {
            imgFormat = 'JPEG';
          }
          doc.addImage(profile.signature, imgFormat, 14, finalY - 18, 35, 15);
        } catch (imgErr) {
          console.warn("Signature image could not be drawn.", imgErr);
        }
      }
      
      // Drawing Signature Line and Texts
      doc.setDrawColor(50, 50, 50);
      doc.line(14, finalY, 65, finalY);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Authorized Signature", 14, finalY + 5);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(profile.instituteName, 14, finalY + 10);

      // System Generated Note
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("System Generated Report", 196, finalY + 5, { align: 'right' });
      doc.text("This is an electronically generated attendance report and does not require a physical signature.", 196, finalY + 10, { align: 'right' });

      doc.save(`${batchName}_${date}_Report.pdf`);
    } catch (err) {
      console.error("PDF Generation Error: ", err);
      alert("পিডিএফ জেনারেট করা যাচ্ছে না। কনসোল চেক করুন।");
    }
  };

  const totalStudents = students.length;
  const markedStudents = Object.values(attendance).filter(v => v !== null).length;
  const remainingStudents = totalStudents - markedStudents;
  const currentBatchName = batches.find(b => b._id === selectedBatch)?.name || 'N/A';
  const displayDate = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      
      {/* ================= STAGE 1: SETUP MODE ================= */}
      {!attendanceMode && (
        <div className="max-w-4xl mx-auto transition-all duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-800">Attendance Setup</h1>
              <p className="text-sm font-bold text-slate-500 mt-1">ব্যাচ এবং তারিখ নির্বাচন করে হাজিরা শুরু করুন</p>
            </div>
            <button 
              onClick={downloadPDF}
              className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-slate-700 transition-all flex items-center gap-2"
            >
              📥 Download Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Batch</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">Choose Batch...</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Attendance Date</label>
              <input 
                type="date" 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {selectedBatch && (
             <div className="flex flex-col items-center justify-center p-10 bg-white border border-dashed border-blue-200 rounded-3xl shadow-sm">
                {loading ? (
                    <p className="text-blue-500 font-bold animate-pulse">Loading students data...</p>
                ) : students.length > 0 ? (
                    <>
                        <p className="text-slate-500 font-bold mb-6">Total <span className="text-blue-600 text-lg">{students.length}</span> students found for this batch.</p>
                        <button 
                            onClick={() => setAttendanceMode(true)}
                            className="bg-blue-600 text-white px-10 py-4 rounded-full text-xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"
                        >
                            🚀 Start Attendance
                        </button>
                    </>
                ) : (
                    <p className="text-rose-500 font-bold">এই ব্যাচে কোনো অ্যাক্টিভ স্টুডেন্ট নেই।</p>
                )}
             </div>
          )}
        </div>
      )}

      {/* ================= STAGE 2: FOCUS (ATTENDANCE) MODE ================= */}
      {attendanceMode && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setAttendanceMode(false)}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-100 transition-all flex items-center gap-2"
                >
                    ← Back
                </button>
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-2">
                    <span className="text-xs font-bold text-blue-400 uppercase block leading-tight">Focus Mode</span>
                    <span className="text-base font-black text-slate-800 mr-2">{displayDate}</span>
                    <span className="text-sm font-bold text-slate-500">({currentBatchName})</span>
                </div>
            </div>

            <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-2 w-full md:w-auto">
              <div className="px-5 text-center border-r border-slate-100">
                <p className="text-2xl font-black text-slate-700">{totalStudents}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Students</p>
              </div>
              <div className="px-5 text-center border-r border-slate-100">
                <p className="text-2xl font-black text-emerald-500">{markedStudents}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Marked</p>
              </div>
              <div className="px-5 text-center">
                <p className="text-2xl font-black text-rose-500">{remainingStudents}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Remaining</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="bg-slate-800 text-slate-300 text-xs font-medium py-2 px-4 flex justify-between items-center">
              <span>Pro Tip: Use <strong className="text-white bg-slate-700 px-2 py-0.5 rounded">Enter</strong> for Present, <strong className="text-white bg-slate-700 px-2 py-0.5 rounded">Backspace</strong> for Absent</span>
              <span>Use <strong className="text-white bg-slate-700 px-2 py-0.5 rounded">↑ ↓</strong> Arrows to navigate</span>
            </div>

            <div className="max-h-[65vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {/* Changed ROLL to Student ID here */}
                    <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase">Student ID</th>
                    <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase">Name</th>
                    <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const isPresent = attendance[student._id] === true;
                    const isAbsent = attendance[student._id] === false;
                    const isFocused = index === activeIndex;

                    return (
                      <tr 
                        key={student._id} 
                        className={`border-b border-slate-100 transition-colors
                          ${isPresent ? 'bg-emerald-50/50' : isAbsent ? 'bg-rose-50/50' : 'bg-white'}
                          ${isFocused ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/30' : ''}
                        `}
                      >
                        {/* Displaying actual Student ID instead of # */}
                        <td className="py-3 px-4 text-sm font-bold text-slate-500">{student.studentId || student.roll}</td>
                        <td className="py-3 px-4 text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full block 
                            ${isPresent ? 'bg-emerald-500' : isAbsent ? 'bg-rose-500' : 'bg-slate-200'}`}>
                          </span>
                          {student.name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                handleMark(student._id, true);
                                setActiveIndex(index);
                              }}
                              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                isPresent ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-emerald-600 hover:bg-emerald-100'
                              }`}
                            >
                              ✓ Present
                            </button>
                            <button 
                              onClick={() => {
                                handleMark(student._id, false);
                                setActiveIndex(index);
                              }}
                              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                isAbsent ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-rose-600 hover:bg-rose-100'
                              }`}
                            >
                              ✕ Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-slate-400 text-xs font-bold">এখান থেকে বের হতে চাইলে Back বাটনে ক্লিক করুন।</p>
                <button 
                onClick={saveAttendance}
                className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95 w-full md:w-auto flex items-center gap-2"
                >
                💾 Save Attendance & Exit
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Attendance;