import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trophy, FileText, Search, Download, ChevronDown } from 'lucide-react';

function ResultManagement() {
  const [activeTab, setActiveTab] = useState('batchWise');
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [exams, setExams] = useState([]);
  const [batchWiseSelectedIds, setBatchWiseSelectedIds] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Combined States
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [examTitleInput, setExamTitleInput] = useState('');
  const [combinedMeritData, setCombinedMeritData] = useState([]);
  
  const [allExams, setAllExams] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState({ instituteName: '', signature: '', logo: '' });

  const token = localStorage.getItem('teacherToken');

  useEffect(() => {
    const initData = async () => {
      try {
        const [batchRes, examRes, studentRes, profileRes] = await Promise.all([
          fetch('http://localhost:3000/api/v1/batches', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:3000/api/v1/exams', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:3000/api/v1/students', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:3000/api/v1/auth/profile', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const batchData = await batchRes.json();
        const examData = await examRes.json();
        const studentData = await studentRes.json();
        const profileData = await profileRes.json();

        setBatches(batchData.data || batchData || []);
        setAllExams(examData.data || examData || []);
        setAllStudents(studentData.data || studentData || []);
        setTeacherProfile({
          instituteName: profileData.instituteName || 'TeacherAI System',
          signature: profileData.signature || '',
          logo: profileData.logo || ''
        });
      } catch (err) {
        console.error("Initialization Fetch Error:", err);
      }
    };
    initData();
  }, [token]);

  const uniqueExamTitles = useMemo(() => {
    const titles = allExams.map(exam => exam.title);
    return [...new Set(titles)].sort();
  }, [allExams]);

  useEffect(() => {
    if (selectedBatch) {
      const filtered = allExams.filter(e => String(e.batchId?._id || e.batchId) === String(selectedBatch));
      setExams(filtered);
      setBatchWiseSelectedIds([]);
      setResults([]);
    }
  }, [selectedBatch, allExams]);

  const resolveStudent = (studentId) => {
    const sId = typeof studentId === 'object' ? studentId._id : studentId;
    return allStudents.find(s => String(s._id) === String(sId)) || { name: 'Unknown Student', roll: 'N/A' };
  };

  const calculateBatchWiseCombined = async () => {
    if (batchWiseSelectedIds.length === 0) return alert("Select at least one exam!");
    setLoading(true);
    try {
      const resultsPromises = batchWiseSelectedIds.map(id => 
        fetch(`http://localhost:3000/api/v1/exams/${id}/results`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
      );
      const resultsArrays = await Promise.all(resultsPromises);
      const map = {};

      resultsArrays.forEach(res => {
        const list = res.data || res || [];
        list.forEach(r => {
          const sId = r.studentId?._id || r.studentId;
          const studentInfo = resolveStudent(sId);
          if (!map[sId]) {
            map[sId] = { 
                name: studentInfo.name, 
                roll: studentInfo.roll || studentInfo.rollNumber, 
                batch: batches.find(b => b._id === selectedBatch)?.name || 'N/A',
                totalScore: 0 
            };
          }
          if (r.isPresent) map[sId].totalScore += (Number(r.col1Marks) || 0) + (Number(r.col2Marks) || 0);
        });
      });
      setResults(Object.values(map).sort((a, b) => b.totalScore - a.totalScore));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchCombinedMeritList = async () => {
    if (selectedBatches.length < 2) return alert("কমপক্ষে ২টি ব্যাচ সিলেক্ট করা বাধ্যতামূলক!");
    if (!examTitleInput) return alert("তালিকা থেকে একটি পরীক্ষা নির্বাচন করুন!");

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/exams/combined-merit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds: selectedBatches, examTitle: examTitleInput })
      });

      const data = await response.json();
      setCombinedMeritData(data || []);
      if (data.length === 0) alert("এই সিলেক্ট করা ব্যাচগুলোতে এই নামের কোনো পরীক্ষার তথ্য পাওয়া যায়নি।");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderRank = (rank) => {
    if (rank === 1) return <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg font-black shadow-sm border border-amber-200">🥇 1st</span>;
    if (rank === 2) return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg font-black shadow-sm border border-slate-200">🥈 2nd</span>;
    if (rank === 3) return <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg font-black shadow-sm border border-orange-200">🥉 3rd</span>;
    return <span className="text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{rank}th</span>;
  };

  const downloadBatchReportPDF = () => {
    if (results.length === 0) return alert("Please generate the result first.");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Theme Colors
    const primaryColor = [37, 99, 235]; 
    const textColor = [31, 41, 55]; 
    const mutedColor = [107, 114, 128]; 

    const batchInfo = batches.find(b => b._id === selectedBatch);
    const batchName = batchInfo?.name || 'N/A';
    const batchTime = batchInfo?.time || batchInfo?.startTime || 'N/A'; 
    
    const displayDate = new Date().toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' });

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
    doc.text("BATCH RESULT REPORT", 14, 33);

    // Header Right
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text(`Batch: ${batchName}`, pageWidth - 14, 20, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    if(batchTime !== 'N/A') doc.text(`Batch Time: ${batchTime}`, pageWidth - 14, 26, { align: "right" });
    doc.text(`Generated: ${displayDate}`, pageWidth - 14, 32, { align: "right" });

    // 2. Exam Information Section
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text("Combined Result Based On:", 14, 45);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    
    const selectedExamsData = exams.filter(e => batchWiseSelectedIds.includes(e._id));
    let examY = 52;
    let totalPossibleMarks = 0;

    selectedExamsData.forEach(exam => {
        doc.text(`• ${exam.title} (Marks: ${exam.totalMarks || 100})`, 18, examY);
        totalPossibleMarks += (exam.totalMarks || 100); 
        examY += 6;
    });

    if(totalPossibleMarks === 0) totalPossibleMarks = 100; 

    // 3. Result Analytics Summary
    const boxY = examY + 8;
    const boxWidth = (pageWidth - 28 - 10) / 3;

    const highestScore = Math.max(...results.map(r => r.totalScore));
    const averageScore = (results.reduce((acc, r) => acc + r.totalScore, 0) / results.length).toFixed(1);

    const drawStatBox = (x, title, value) => {
        doc.setFillColor(249, 250, 251); 
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(x, boxY, boxWidth, 20, 2, 2, 'FD');
        doc.setFontSize(9);
        doc.setTextColor(...mutedColor);
        doc.text(title, x + boxWidth/2, boxY + 8, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(String(value), x + boxWidth/2, boxY + 16, { align: 'center' });
    };

    drawStatBox(14, "Total Students", results.length);
    drawStatBox(14 + boxWidth + 5, "Highest Score", highestScore);
    drawStatBox(14 + (boxWidth * 2) + 10, "Average Score", averageScore);

    // 4. Result Table
    const tableData = results.map((s, index) => {
        const percentage = ((s.totalScore / totalPossibleMarks) * 100).toFixed(1);
        return [
            index + 1, 
            s.name, 
            s.batch, 
            `${s.totalScore} / ${totalPossibleMarks}`, 
            `${percentage}%`
        ];
    });

    autoTable(doc, {
        startY: boxY + 30,
        head: [['Rank', 'Student Name', 'Batch', 'Score', 'Percentage']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 11, halign: 'center' },
        bodyStyles: { textColor: textColor, fontSize: 10.5, halign: 'center', valign: 'middle' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { cellPadding: 6, lineColor: [229, 231, 235], lineWidth: 0.1 },
        columnStyles: {
            0: { cellWidth: '10%', fontStyle: 'bold' },
            1: { cellWidth: '35%', halign: 'left', fontStyle: 'bold' },
            2: { cellWidth: '20%' },
            3: { cellWidth: '15%' },
            4: { cellWidth: '20%', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
            if (data.section === 'body') {
                const rankVal = parseInt(data.row.raw[0], 10);
                if (rankVal === 1) { 
                    data.cell.styles.fillColor = [250, 204, 21]; 
                    data.cell.styles.textColor = [0, 0, 0];
                } else if (rankVal === 2) { 
                    data.cell.styles.fillColor = [209, 213, 219]; 
                    data.cell.styles.textColor = [0, 0, 0];
                } else if (rankVal === 3) { 
                    data.cell.styles.fillColor = [253, 186, 116]; 
                    data.cell.styles.textColor = [0, 0, 0];
                }
            }
        },
        margin: { bottom: 40 }
    });

    // 5. Footer Section
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

    doc.save(`Batch_Result_Report_${batchName}.pdf`);
  };

  // 🚀 REDESIGNED: COMBINED GLOBAL MERIT REPORT PDF
  const downloadGlobalMeritPDF = () => {
    if (combinedMeritData.length === 0) return alert("Please generate the merit list first.");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Theme Colors
    const primaryColor = [37, 99, 235]; // Blue #2563EB
    const textColor = [31, 41, 55]; // Gray 800
    const mutedColor = [107, 114, 128]; // Gray 500

    // 🚀 UX IMPROVEMENT: Fetch names of selected batches
    const selectedBatchNames = selectedBatches
      .map(id => batches.find(b => b._id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'N/A';

    const displayDate = new Date().toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' });
    const totalPossibleMarks = combinedMeritData[0]?.totalMarks || 100;

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
    doc.text("COMBINED GLOBAL MERIT REPORT", 14, 33);

    // Header Right
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    
    // Auto wrap batch names if too long
    const splitBatches = doc.splitTextToSize(`Selected Batches: ${selectedBatchNames}`, 85);
    let rightY = 20;
    splitBatches.forEach(line => {
        doc.text(line, pageWidth - 14, rightY, { align: "right" });
        rightY += 5;
    });
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    doc.text(`Exam: ${examTitleInput}`, pageWidth - 14, rightY + 1, { align: "right" });
    doc.text(`Generated: ${displayDate}`, pageWidth - 14, rightY + 7, { align: "right" });

    // 2. Exam Information Section
    const sectionTopY = Math.max(45, rightY + 15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text("Merit List Based On:", 14, sectionTopY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    
    let examY = sectionTopY + 7;
    doc.text(`• ${examTitleInput} (Marks: ${totalPossibleMarks})`, 18, examY);

    // 3. Result Analytics Summary
    const boxY = examY + 8;
    const boxWidth = (pageWidth - 28 - 10) / 3;

    const highestScore = Math.max(...combinedMeritData.map(r => r.marks));
    const averageScore = (combinedMeritData.reduce((acc, r) => acc + r.marks, 0) / combinedMeritData.length).toFixed(1);

    const drawStatBox = (x, title, value) => {
        doc.setFillColor(249, 250, 251); 
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(x, boxY, boxWidth, 20, 2, 2, 'FD');
        doc.setFontSize(9);
        doc.setTextColor(...mutedColor);
        doc.text(title, x + boxWidth/2, boxY + 8, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(String(value), x + boxWidth/2, boxY + 16, { align: 'center' });
    };

    drawStatBox(14, "Total Students", combinedMeritData.length);
    drawStatBox(14 + boxWidth + 5, "Highest Score", highestScore);
    drawStatBox(14 + (boxWidth * 2) + 10, "Average Score", averageScore);

    // 4. Result Table
    const tableData = combinedMeritData.map((s) => [
        s.rank, 
        s.name, 
        s.batch || 'N/A', 
        `${s.marks} / ${s.totalMarks}`, 
        `${s.percentage}%`
    ]);

    autoTable(doc, {
        startY: boxY + 30,
        head: [['Rank', 'Student Name', 'Batch', 'Score', 'Percentage']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 11, halign: 'center' },
        bodyStyles: { textColor: textColor, fontSize: 10.5, halign: 'center', valign: 'middle' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { cellPadding: 6, lineColor: [229, 231, 235], lineWidth: 0.1 },
        columnStyles: {
            0: { cellWidth: '10%', fontStyle: 'bold' },
            1: { cellWidth: '35%', halign: 'left', fontStyle: 'bold' },
            2: { cellWidth: '20%' },
            3: { cellWidth: '15%' },
            4: { cellWidth: '20%', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
            // 🚀 HIGHLIGHT TOP 3 STUDENTS (Works even if multiple rank 1s)
            if (data.section === 'body') {
                const rankVal = parseInt(data.row.raw[0], 10);
                if (rankVal === 1) { 
                    data.cell.styles.fillColor = [250, 204, 21]; // Gold
                    data.cell.styles.textColor = [0, 0, 0];
                } else if (rankVal === 2) { 
                    data.cell.styles.fillColor = [209, 213, 219]; // Silver
                    data.cell.styles.textColor = [0, 0, 0];
                } else if (rankVal === 3) { 
                    data.cell.styles.fillColor = [253, 186, 116]; // Bronze
                    data.cell.styles.textColor = [0, 0, 0];
                }
            }
        },
        margin: { bottom: 40 }
    });

    // 5. Footer Section
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const footerY = pageHeight - 25;

        // Signature on the last page only
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

    doc.save(`Global_Merit_Report_${examTitleInput}.pdf`);
  };

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen">
      <div className="flex justify-between items-center mb-8 border-b-2 border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Result Management</h1>
          <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">Analytics & Merit Tracking System</p>
        </div>
      </div>

      <div className="flex gap-2 mb-10 bg-slate-900 p-1.5 rounded-2xl w-fit shadow-2xl">
        <button onClick={() => setActiveTab('batchWise')} className={`px-10 py-3.5 rounded-xl font-black text-xs tracking-widest transition-all cursor-pointer ${activeTab === 'batchWise' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>BATCH-WISE</button>
        <button onClick={() => setActiveTab('combined')} className={`px-10 py-3.5 rounded-xl font-black text-xs tracking-widest transition-all cursor-pointer ${activeTab === 'combined' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>COMBINED MERIT</button>
      </div>

      {activeTab === 'batchWise' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">১. ব্যাচ নির্বাচন করুন</h3>
            <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 mb-4" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
              <option value="">Choose a Batch...</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            {selectedBatch && (
              <>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar border-t border-slate-50 pt-4">
                  {exams.length > 0 ? exams.map(exam => (
                    <div key={exam._id} onClick={() => setBatchWiseSelectedIds(prev => prev.includes(exam._id) ? prev.filter(id => id !== exam._id) : [...prev, exam._id])} 
                         className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${batchWiseSelectedIds.includes(exam._id) ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}>
                      <div className="font-black text-sm text-slate-800">{exam.title}</div>
                      <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Marks: {exam.totalMarks || 100}</div>
                    </div>
                  )) : <p className="text-slate-300 text-xs font-bold text-center py-10">কোনো পরীক্ষা পাওয়া যায়নি</p>}
                </div>
                <button onClick={calculateBatchWiseCombined} className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-lg uppercase text-xs tracking-widest">Generate Result</button>
              </>
            )}
          </div>
          <div className="lg:col-span-3 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            {loading ? <div className="py-32 text-center text-slate-300 font-black animate-pulse uppercase tracking-widest">Processing Results...</div> : results.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Batch Merit Standings</h3>
                  <button onClick={downloadBatchReportPDF} className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] shadow-lg hover:bg-emerald-600 transition-all uppercase tracking-widest flex items-center gap-2"><Download size={14} /> Download PDF</button>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[11px] font-black uppercase tracking-widest border-b-2 border-slate-100">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4 text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-all group">
                        <td className="px-6 py-5">{renderRank(i + 1)}</td>
                        <td className="px-6 py-5 font-black text-slate-800">{r.name}</td>
                        <td className="px-6 py-5 text-center font-black text-2xl text-slate-900">{r.totalScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="py-40 text-center border-2 border-dashed border-slate-100 rounded-4xl text-slate-300 font-black uppercase tracking-widest">Select batch and exams from the left</div>}
          </div>
        </div>
      )}

      {activeTab === 'combined' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-1">১. ব্যাচ নির্বাচন করুন</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar border-b-2 border-slate-50 pb-6 mb-6">
              {batches.map(batch => (
                <label key={batch._id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent has-[:checked]:border-blue-100 has-[:checked]:bg-blue-50/30 group">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBatches([...selectedBatches, batch._id]);
                      else setSelectedBatches(selectedBatches.filter(id => id !== batch._id));
                    }}
                  />
                  <span className="font-bold text-slate-700 text-sm group-hover:text-blue-600 transition-colors">{batch.name}</span>
                </label>
              ))}
            </div>

            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">২. পরীক্ষা নির্বাচন করুন</h3>
            <div className="relative mb-8">
              <select 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none cursor-pointer pr-10"
                value={examTitleInput}
                onChange={(e) => setExamTitleInput(e.target.value)}
              >
                <option value="">একটি পরীক্ষা বেছে নিন...</option>
                {uniqueExamTitles.map((title, idx) => (
                  <option key={idx} value={title}>{title}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>

            <button onClick={fetchCombinedMeritList} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-xl uppercase text-xs tracking-widest flex items-center justify-center gap-2">
              <Trophy size={16} /> Generate Merit List
            </button>
          </div>

          <div className="lg:col-span-3 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Combined Global Merit</h3>
              {combinedMeritData.length > 0 && (
                // 🚀 Connected to the new premium global merit PDF function
                <button onClick={downloadGlobalMeritPDF} className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] shadow-lg hover:bg-emerald-600 transition-all uppercase tracking-widest flex items-center gap-2"><Download size={14} /> Export Merit List</button>
              )}
            </div>

            {loading ? <div className="py-32 text-center text-slate-300 font-black animate-pulse uppercase tracking-widest">Processing Global Merit Data...</div> : combinedMeritData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[11px] font-black uppercase tracking-widest border-b-2 border-slate-100">
                      <th className="px-4 py-4">Rank</th>
                      <th className="px-4 py-4">Student Info</th>
                      <th className="px-4 py-4">Batch</th>
                      <th className="px-4 py-4 text-center">Score</th>
                      <th className="px-4 py-4 text-right">Percent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {combinedMeritData.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-all group">
                        <td className="px-4 py-6">{renderRank(item.rank)}</td>
                        <td className="px-4 py-6">
                          <div className="font-black text-slate-800 text-base">{item.name}</div>
                          <div className="text-[11px] font-bold text-slate-400 tracking-tighter uppercase">ID: {item.studentId}</div>
                        </td>
                        <td className="px-4 py-6">
                          <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-blue-100">{item.batch}</span>
                        </td>
                        <td className="px-4 py-6 text-center">
                          <span className="text-2xl font-black text-slate-900">{item.marks}</span>
                          <span className="block text-[9px] font-bold text-slate-300 uppercase mt-0.5">Out of {item.totalMarks}</span>
                        </td>
                        <td className="px-4 py-6 text-right font-black text-emerald-500 text-lg">{item.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="py-40 text-center border-2 border-dashed border-slate-100 rounded-4xl text-slate-300 font-black uppercase tracking-widest px-10">Select multiple batches and choose an exam from the dropdown to see grand merit standings</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultManagement;