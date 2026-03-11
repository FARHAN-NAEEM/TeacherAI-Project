import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ArrowLeft, Download, Save, Users, Target } from 'lucide-react'; 

function ExamResultsNew() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('teacherToken');

  const [exam, setExam] = useState(null);
  const [resultsData, setResultsData] = useState([]);
  const [columns, setColumns] = useState({ col1Name: 'MCQ', col2Name: 'Written' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  
  const [focusedRowId, setFocusedRowId] = useState(null);
  
  const [teacherProfile, setTeacherProfile] = useState({ instituteName: '', signature: '' });

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        if (!examId) throw new Error("Exam ID is missing!");

        const examRes = await fetch(`http://localhost:3000/api/v1/exams/${examId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const examDataRaw = await examRes.json();
        const examData = examDataRaw.data || examDataRaw;
        
        if (!examData) throw new Error("Exam not found!");
        setExam(examData);
        setColumns({ col1Name: examData.col1Name || 'MCQ', col2Name: examData.col2Name || 'Written' });

        const batchId = examData.batchId?._id || examData.batchId;
        
        let examDate = '';
        if (examData.date) {
          examDate = String(examData.date).includes('T') ? String(examData.date).split('T')[0] : String(examData.date);
        } else {
          examDate = new Date().toISOString().split('T')[0];
        }

        const [studentsRes, savedResultsRes, attendanceRes, profileRes] = await Promise.all([
          fetch(`http://localhost:3000/api/v1/students?batchId=${batchId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`http://localhost:3000/api/v1/exams/${examId}/results`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`http://localhost:3000/api/v1/attendance/check?batchId=${batchId}&date=${examDate}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`http://localhost:3000/api/v1/auth/profile`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const studentsData = await studentsRes.json();
        const savedResults = await savedResultsRes.json();
        const attendanceData = await attendanceRes.json();
        const profileData = await profileRes.json();

        setTeacherProfile({
          instituteName: profileData.instituteName || '',
          signature: profileData.signature || ''
        });

        const studentsList = studentsData.data || studentsData || [];
        const savedResultsList = savedResults.data || savedResults || [];
        
        let attendanceRecords = [];
        if (Array.isArray(attendanceData)) attendanceRecords = attendanceData;
        else if (attendanceData?.data && Array.isArray(attendanceData.data)) attendanceRecords = attendanceData.data;
        else if (attendanceData?.records && Array.isArray(attendanceData.records)) attendanceRecords = attendanceData.records;

        const mergedData = Array.isArray(studentsList) ? studentsList.map(student => {
          const existingResult = Array.isArray(savedResultsList) ? savedResultsList.find(r => String(r.studentId) === String(student._id)) : null;
          
          const attendanceRecord = attendanceRecords.find(a => 
            String(a.studentId) === String(student._id) || 
            (a.studentId && String(a.studentId._id) === String(student._id)) ||
            String(a.student) === String(student._id)
          );
          
          let isPresent = true;
          
          if (existingResult) {
            isPresent = existingResult.isPresent === true || String(existingResult.isPresent).toLowerCase() === 'true';
          } else if (attendanceRecord) {
            isPresent = attendanceRecord.isPresent === true || String(attendanceRecord.isPresent).toLowerCase() === 'true';
          }

          return {
            studentId: student._id,
            name: student.name,
            displayId: student.studentId || student.rollNumber || student.roll || 'N/A', 
            col1Marks: existingResult ? existingResult.col1Marks : '',
            col2Marks: existingResult ? existingResult.col2Marks : '',
            isPresent: isPresent
          };
        }) : [];

        setResultsData(mergedData);
      } catch (error) {
        console.error("🔥 Error:", error.message);
        setMessage({ text: `সমস্যা: ${error.message}`, type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [examId, token]);

  const toggleAttendanceStatus = (studentId) => {
    setResultsData(prev => prev.map(student => 
      student.studentId === studentId ? { ...student, isPresent: !student.isPresent } : student
    ));
  };

  const handleMarksChange = (studentId, field, value) => {
    setResultsData(prev => prev.map(student => 
      student.studentId === studentId ? { ...student, [field]: value } : student
    ));
  };

  const handleSaveColumns = async () => {
    try {
      await fetch(`http://localhost:3000/api/v1/exams/${examId}/columns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(columns)
      });
      setIsEditingColumns(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAllResults = async () => {
    setSaving(true);
    const batchId = exam?.batchId?._id || exam?.batchId;
    const payload = resultsData.map(r => ({
      studentId: r.studentId,
      col1Marks: r.isPresent ? (Number(r.col1Marks) || 0) : 0,
      col2Marks: r.isPresent ? (Number(r.col2Marks) || 0) : 0,
      isPresent: r.isPresent
    }));

    try {
      const res = await fetch(`http://localhost:3000/api/v1/exams/${examId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ batchId, results: payload })
      });
      if (res.ok) {
        setMessage({ text: '✅ রেজাল্ট সেভ হয়েছে!', type: 'success' });
      } else {
        setMessage({ text: '❌ সেভ করতে সমস্যা হয়েছে।', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: '❌ সার্ভার এরর!', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    }
  };

  const studentsWithTotal = resultsData.map(s => {
    const total = s.isPresent ? (Number(s.col1Marks) || 0) + (Number(s.col2Marks) || 0) : 0;
    return { ...s, total };
  });

  const uniqueTotals = [...new Set(studentsWithTotal.filter(s => s.isPresent && s.total > 0).map(s => s.total))].sort((a, b) => b - a);

  const getMeritString = (isPresent, total) => {
    if (!isPresent) return <span className="text-slate-300 font-medium">-</span>;
    if (total === 0) return <span className="text-slate-300 font-medium">-</span>;
    
    const rank = uniqueTotals.indexOf(total) + 1;
    if (rank === 1) return <span className="text-amber-600 font-black text-sm bg-amber-50 border border-amber-100 px-3 py-1 rounded-lg">1st 🏆</span>;
    if (rank === 2) return <span className="text-slate-600 font-black text-sm bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">2nd 🥈</span>;
    if (rank === 3) return <span className="text-orange-600 font-black text-sm bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg">3rd 🥉</span>;
    return <span className="text-[#4F6DF5] font-bold text-sm bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">{rank}th</span>;
  };

  // 🚀 REDESIGNED PREMIUM PDF REPORT 
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Theme Colors
      const primaryColor = [37, 99, 235]; // #2563EB Blue
      const textColor = [31, 41, 55]; // Gray 800
      const mutedColor = [107, 114, 128]; // Gray 500

      const pdfTitle = exam?.title || 'Exam Results';
      const batchName = exam?.batchId?.name || 'N/A';
      const displayDate = new Date().toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' });
      const maxMarks = exam?.totalMarks || 100;

      // 1. Header Section
      if (teacherProfile.logo) {
        try { doc.addImage(teacherProfile.logo, 'PNG', 14, 15, 16, 16); } catch (e) { }
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(teacherProfile.instituteName || "TeacherAI System", 34, 24);
      } else {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(teacherProfile.instituteName || "TeacherAI System", 14, 25);
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("EXAM RESULT REPORT", 14, 33);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(`Batch: ${batchName}`, pageWidth - 14, 20, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedColor);
      doc.text(`Exam: ${pdfTitle}`, pageWidth - 14, 26, { align: "right" });
      doc.text(`Generated: ${displayDate}`, pageWidth - 14, 32, { align: "right" });

      // 2. Summary Statistics Cards
      const startY = 45;
      const presentStudents = studentsWithTotal.filter(s => s.isPresent);
      const highestScore = presentStudents.length > 0 ? Math.max(...presentStudents.map(s => s.total)) : 0;
      const averageScore = presentStudents.length > 0 ? (presentStudents.reduce((acc, s) => acc + s.total, 0) / presentStudents.length).toFixed(1) : 0;

      const boxWidth = (pageWidth - 28 - 10) / 3;
      const drawStatBox = (x, title, value) => {
          doc.setFillColor(249, 250, 251);
          doc.setDrawColor(229, 231, 235);
          doc.roundedRect(x, startY, boxWidth, 20, 2, 2, 'FD');
          doc.setFontSize(9);
          doc.setTextColor(...mutedColor);
          doc.text(title, x + boxWidth/2, startY + 8, { align: 'center' });
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...textColor);
          doc.text(String(value), x + boxWidth/2, startY + 16, { align: 'center' });
      };

      drawStatBox(14, "Total Students", studentsWithTotal.length);
      drawStatBox(14 + boxWidth + 5, "Highest Score", highestScore);
      drawStatBox(14 + (boxWidth * 2) + 10, "Average Score", averageScore);

      // 3. Merit Table (Sorted by highest total)
      const sortedStudents = [...studentsWithTotal].sort((a, b) => {
         if (!a.isPresent && b.isPresent) return 1;
         if (a.isPresent && !b.isPresent) return -1;
         return b.total - a.total;
      });

      const tableColumn = ["Rank", "Student Info", "Status", columns.col1Name, columns.col2Name, "Score", "Percent"];
      const tableRows = [];

      sortedStudents.forEach(s => {
        let rankVal = '-';
        if (s.isPresent && s.total > 0) {
          rankVal = uniqueTotals.indexOf(s.total) + 1;
        }

        const percentage = s.isPresent ? ((s.total / maxMarks) * 100).toFixed(1) + '%' : '-';

        const studentData = [
          rankVal,
          `${s.name}\nID: ${s.displayId || 'N/A'}`,
          s.isPresent ? 'Present' : 'Absent',
          s.isPresent ? s.col1Marks : '-',
          s.isPresent ? s.col2Marks : '-',
          s.isPresent ? `${s.total} / ${maxMarks}` : '-',
          percentage
        ];
        tableRows.push(studentData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY + 30,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 10 },
        bodyStyles: { textColor: textColor, fontSize: 9.5, halign: 'center', valign: 'middle' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { cellPadding: 5, lineColor: [229, 231, 235], lineWidth: 0.1 },
        columnStyles: {
            0: { cellWidth: '10%', fontStyle: 'bold' },
            1: { cellWidth: '30%', halign: 'left' },
            2: { cellWidth: '12%' },
            3: { cellWidth: '12%' },
            4: { cellWidth: '12%' },
            5: { cellWidth: '13%', fontStyle: 'bold' },
            6: { cellWidth: '11%', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
            if (data.section === 'body') {
                const rankNum = parseInt(data.row.raw[0], 10);
                
                // Top 3 Highlights
                if (rankNum === 1) {
                    data.cell.styles.fillColor = [250, 204, 21]; 
                    data.cell.styles.textColor = [0, 0, 0];
                } else if (rankNum === 2) {
                    data.cell.styles.fillColor = [209, 213, 219]; 
                    data.cell.styles.textColor = [0, 0, 0];
                } else if (rankNum === 3) {
                    data.cell.styles.fillColor = [253, 186, 116]; 
                    data.cell.styles.textColor = [0, 0, 0];
                }
                
                // Status and Percentage color styling
                if (data.column.index === 2) {
                    if (data.cell.raw === 'Absent') data.cell.styles.textColor = [220, 38, 38];
                    else if (data.cell.raw === 'Present' && rankNum > 3) data.cell.styles.textColor = [22, 163, 74];
                }
                if (data.column.index === 6 && rankNum > 3 && data.cell.raw !== '-') {
                    data.cell.styles.textColor = [22, 163, 74];
                }
            }
        },
        margin: { bottom: 40 }
      });

      // 4. Footer Section
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const footerY = pageHeight - 25;

        if(i === totalPages) {
            if (teacherProfile.signature) {
                try { doc.addImage(teacherProfile.signature, 'PNG', 14, footerY - 15, 35, 12); } catch(e) {}
            }
            doc.setDrawColor(...textColor);
            doc.line(14, footerY, 60, footerY);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...textColor);
            doc.text("Authorized Signature", 14, footerY + 6);
            doc.setFont("helvetica", "normal");
            doc.text(teacherProfile.instituteName || "TeacherAI System", 14, footerY + 11);
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...mutedColor);
        doc.text("System Generated Result", pageWidth - 14, footerY + 11, { align: "right" });

        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text("This is an electronically generated result report and does not require a physical signature.", pageWidth / 2, pageHeight - 12, { align: 'center' });
      }

      const fileName = `${pdfTitle.replace(/\s+/g, '_')}_Results.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error("🔥 PDF Generation Error:", error);
      alert("PDF তৈরি করতে সমস্যা হচ্ছে! F12 চেপে কনসোল চেক করুন।");
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="p-8 text-center text-slate-400 font-black animate-pulse text-lg uppercase tracking-widest">Loading Students...</div></div>;

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        
        {/* 🚀 PAGE HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
          <div>
            <button onClick={() => navigate('/exams')} className="flex items-center gap-2 text-[#4F6DF5] font-bold mb-4 hover:text-[#6C4DF6] transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Exams
            </button>
            <h1 className="text-[32px] font-black text-slate-900 tracking-tight leading-none mb-1">{exam?.title}</h1>
            <p className="text-slate-500 font-medium text-sm">Batch: <span className="font-bold text-slate-700">{exam?.batchId?.name}</span></p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-[10px] font-bold text-sm shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button onClick={handleSaveAllResults} disabled={saving} className="flex items-center gap-2 bg-gradient-to-r from-[#4F6DF5] to-[#6C4DF6] text-white px-8 py-3 rounded-[10px] font-bold tracking-wide text-sm shadow-lg shadow-indigo-200/50 hover:shadow-indigo-400/50 transition-all active:scale-95">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Marks'}
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-[12px] text-center font-bold shadow-sm border animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
            {message.text}
          </div>
        )}

        {/* 🚀 EXAM INFO CARD */}
        <div className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-8">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#4F6DF5] flex items-center justify-center"><Users className="w-5 h-5" /></div>
                <div>
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
                   <p className="text-lg font-black text-slate-800">{studentsWithTotal.length}</p>
                </div>
             </div>
             <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><Target className="w-5 h-5" /></div>
                <div>
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Marks</p>
                   <p className="text-lg font-black text-slate-800">{exam?.totalMarks || 100}</p>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[12px] border border-slate-100">
            {isEditingColumns ? (
              <>
                <input type="text" value={columns.col1Name} onChange={(e) => setColumns({...columns, col1Name: e.target.value})} className="border border-slate-200 p-2 rounded-[8px] font-bold text-slate-700 w-28 outline-none focus:border-[#4F6DF5] text-center text-sm shadow-sm" />
                <input type="text" value={columns.col2Name} onChange={(e) => setColumns({...columns, col2Name: e.target.value})} className="border border-slate-200 p-2 rounded-[8px] font-bold text-slate-700 w-28 outline-none focus:border-[#4F6DF5] text-center text-sm shadow-sm" />
                <button onClick={handleSaveColumns} className="bg-slate-800 text-white px-4 py-2 rounded-[8px] font-bold text-sm shadow-sm hover:bg-slate-700 transition-colors">Save</button>
              </>
            ) : (
              <>
                <div className="px-4 py-1.5 rounded-[8px] font-bold text-slate-600 bg-white shadow-sm text-sm border border-slate-200">{columns.col1Name}</div>
                <div className="px-4 py-1.5 rounded-[8px] font-bold text-slate-600 bg-white shadow-sm text-sm border border-slate-200">{columns.col2Name}</div>
                <button onClick={() => setIsEditingColumns(true)} className="text-[#4F6DF5] font-bold text-sm px-2 hover:underline">Edit Columns</button>
              </>
            )}
          </div>
        </div>

        {/* 🚀 MARKS ENTRY CARD */}
        <div className="bg-white rounded-[16px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left border-collapse relative">
              
              <thead className="bg-[#F8FAFC] border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">Student</th>
                  <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-wider text-[#4F6DF5]">{columns.col1Name}</th>
                  <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-wider text-[#4F6DF5]">{columns.col2Name}</th>
                  <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50/50">Total</th>
                  <th className="px-8 py-5 text-center text-[11px] font-black uppercase tracking-wider text-slate-500">Merit Rank</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {studentsWithTotal.map((s) => {
                  const isFocused = focusedRowId === s.studentId;

                  return (
                    <tr 
                      key={s.studentId} 
                      className={`transition-colors duration-200 ${!s.isPresent ? 'opacity-60 bg-slate-50/50' : ''} ${isFocused && s.isPresent ? 'bg-[#F7F9FF]' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm border border-slate-200 flex-shrink-0">
                              {s.name.charAt(0).toUpperCase()}
                           </div>
                           <div>
                             <div className="font-bold text-slate-800 text-[15px]">{s.name}</div>
                             <div className="text-[12px] font-medium text-slate-400 mt-0.5 tracking-wide">ID: <span className="text-slate-500 font-semibold">{s.displayId}</span></div>
                           </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => toggleAttendanceStatus(s.studentId)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all ${s.isPresent ? 'bg-emerald-100 text-emerald-700 hover:bg-rose-100 hover:text-rose-700' : 'bg-rose-100 text-rose-700 hover:bg-emerald-100 hover:text-emerald-700'}`}
                        >
                          {s.isPresent ? 'Present' : 'Absent'}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <input 
                          type="number" 
                          disabled={!s.isPresent} 
                          value={s.isPresent ? s.col1Marks : ''} 
                          onChange={(e) => handleMarksChange(s.studentId, 'col1Marks', e.target.value)} 
                          onFocus={() => setFocusedRowId(s.studentId)}
                          onBlur={() => setFocusedRowId(null)}
                          className={`w-20 text-center p-2 rounded-[10px] font-bold text-[15px] outline-none transition-all ${!s.isPresent ? 'bg-transparent text-slate-300 placeholder-transparent' : 'bg-white border border-slate-200 text-slate-800 focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-100 shadow-sm'}`} 
                          placeholder="-"
                        />
                      </td>

                      <td className="px-6 py-4 text-center">
                        <input 
                          type="number" 
                          disabled={!s.isPresent} 
                          value={s.isPresent ? s.col2Marks : ''} 
                          onChange={(e) => handleMarksChange(s.studentId, 'col2Marks', e.target.value)} 
                          onFocus={() => setFocusedRowId(s.studentId)}
                          onBlur={() => setFocusedRowId(null)}
                          className={`w-20 text-center p-2 rounded-[10px] font-bold text-[15px] outline-none transition-all ${!s.isPresent ? 'bg-transparent text-slate-300 placeholder-transparent' : 'bg-white border border-slate-200 text-slate-800 focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-100 shadow-sm'}`} 
                          placeholder="-"
                        />
                      </td>

                      <td className="px-6 py-4 text-center bg-[#F8FAFF]">
                        <span className={`font-black text-xl transition-all duration-300 ${s.total > 0 ? 'text-[#4F6DF5] scale-110 inline-block' : 'text-slate-300'}`}>
                          {s.isPresent ? s.total : '-'}
                        </span>
                      </td>

                      <td className="px-8 py-4 text-center">
                        {getMeritString(s.isPresent, s.total)}
                      </td>

                    </tr>
                  );
                })}
                {studentsWithTotal.length === 0 && (
                  <tr><td colSpan="6" className="text-center py-20 text-slate-400 font-bold">No students found in this batch.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamResultsNew;