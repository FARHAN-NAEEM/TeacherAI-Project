import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, CalendarDays, Search } from 'lucide-react'; 

function AttendanceHistory() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('teacherToken');

  // ১. ব্যাচ লিস্ট লোড করা
  useEffect(() => {
    fetch('http://localhost:3000/api/v1/batches', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setBatches(data));
  }, [token]);

  // ২. নির্দিষ্ট মাস ও ব্যাচের পুরো রিপোর্ট আনা
  const fetchReport = async () => {
    if (!selectedBatch) return alert("দয়া করে আগে একটি ব্যাচ সিলেক্ট করুন!");
    setLoading(true);
    try {
      const [reportRes, studentsRes] = await Promise.all([
        fetch(`http://localhost:3000/api/v1/attendance/report?batchId=${selectedBatch}&month=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3000/api/v1/students?batchId=${selectedBatch}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const reportRaw = await reportRes.json();
      const studentsRaw = await studentsRes.json();

      const reportList = Array.isArray(reportRaw) ? reportRaw : (reportRaw.data || []);
      const studentsList = studentsRaw.data || studentsRaw || [];

      const mergedData = reportList.map(item => {
        const matchedStudent = studentsList.find(s => String(s._id) === String(item.studentId));
        return {
          ...item,
          displayId: matchedStudent?.studentId || matchedStudent?.rollNumber || item.studentRoll || 'N/A'
        };
      });

      setReportData(mergedData);
    } catch (err) {
      console.error("Report Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ৩. মাসিক মাস্টার রিপোর্ট পিডিএফ ডাউনলোড
  const downloadMonthlyPDF = async () => {
    if (reportData.length === 0) return alert("ডাউনলোড করার মতো কোনো ডাটা নেই!");

    try {
      let profile = { instituteName: "TeacherAI System", signature: null };

      try {
        const profRes = await fetch('http://localhost:3000/api/v1/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profRes.ok) {
          const data = await profRes.json();
          if (data.instituteName) profile.instituteName = data.instituteName;
          if (data.signature) profile.signature = data.signature;
        }
      } catch (profileErr) {
        console.warn("Profile fetch failed, using default name.");
      }
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Theme Colors
      const primaryColor = [37, 99, 235]; 
      const textColor = [31, 41, 55]; 
      const mutedColor = [107, 114, 128]; 

      const batchName = batches.find(b => b._id === selectedBatch)?.name || 'N/A';
      const displayDate = new Date().toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' });

      // 1. Header Section
      if (profile.logo) {
        try { doc.addImage(profile.logo, 'PNG', 14, 15, 16, 16); } catch (e) { }
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(profile.instituteName, 34, 24);
      } else {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(profile.instituteName, 14, 25);
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("MONTHLY ATTENDANCE REPORT", 14, 33);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(`Batch: ${batchName}`, pageWidth - 14, 20, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedColor);
      doc.text(`Month: ${selectedMonth}`, pageWidth - 14, 26, { align: "right" });
      doc.text(`Generated: ${displayDate}`, pageWidth - 14, 32, { align: "right" });

      // 2. Summary Statistics Cards
      const startY = 45;
      const totalStudents = reportData.length;
      const avgAttendance = totalStudents > 0 ? (reportData.reduce((acc, curr) => acc + curr.percentage, 0) / totalStudents).toFixed(1) : 0;
      const perfectAttendance = reportData.filter(s => s.percentage === 100).length;

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

      drawStatBox(14, "Total Students", totalStudents);
      drawStatBox(14 + boxWidth + 5, "Average Attendance", `${avgAttendance}%`);
      drawStatBox(14 + (boxWidth * 2) + 10, "Perfect Attendance", perfectAttendance);

      // 3. Styled Merit/Attendance Table
      const sortedData = [...reportData].sort((a, b) => b.percentage - a.percentage);

      const tableColumn = ['Rank', 'Student ID', 'Student Name', 'Total Classes', 'Present', 'Absent', 'Attendance'];
      const tableRows = sortedData.map((item, idx) => [
          idx + 1,
          item.displayId,
          item.studentName,
          item.totalClasses,
          item.presentDays,
          item.absentDays,
          `${item.percentage}%`
      ]);

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
              0: { cellWidth: '8%', fontStyle: 'bold' },
              1: { cellWidth: '20%' },
              2: { cellWidth: '26%', halign: 'left', fontStyle: 'bold' },
              3: { cellWidth: '12%' },
              4: { cellWidth: '10%' },
              5: { cellWidth: '10%' },
              6: { cellWidth: '14%', fontStyle: 'bold' }
          },
          didParseCell: function(data) {
              if (data.section === 'body') {
                  const percentage = parseFloat(data.row.raw[6]);
                  
                  if (data.column.index === 6) {
                      if (percentage >= 80) data.cell.styles.textColor = [22, 163, 74]; 
                      else if (percentage >= 50) data.cell.styles.textColor = [217, 119, 6]; 
                      else data.cell.styles.textColor = [220, 38, 38]; 
                  }
                  
                  if (percentage === 100) {
                      data.cell.styles.fillColor = [254, 252, 232]; 
                  }
              }
          },
          margin: { bottom: 40 }
      });

      // 🚀 NEW: Attendance Summary Box & Threshold Note below table
      let finalY = doc.lastAutoTable.finalY + 15;

      // Check if space is sufficient for the summary block
      if (finalY > pageHeight - 65) {
          doc.addPage();
          finalY = 20;
      }

      const above90 = reportData.filter(s => s.percentage >= 90).length;
      const between80and89 = reportData.filter(s => s.percentage >= 80 && s.percentage < 90).length;
      const below80 = reportData.filter(s => s.percentage < 80).length;

      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(14, finalY, pageWidth - 28, 28, 2, 2, 'FD');

      // Column 1
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text("Total Students:", 18, finalY + 9);
      doc.setFont("helvetica", "normal");
      doc.text(String(totalStudents), 45, finalY + 9);

      doc.setFont("helvetica", "bold");
      doc.text("Students Above 90% Attendance:", 18, finalY + 15);
      doc.setFont("helvetica", "normal");
      doc.text(String(above90), 71, finalY + 15);

      // Column 2
      doc.setFont("helvetica", "bold");
      doc.text("Students Between 80-89%:", 105, finalY + 9);
      doc.setFont("helvetica", "normal");
      doc.text(String(between80and89), 147, finalY + 9);

      doc.setFont("helvetica", "bold");
      doc.text("Students Below 80%:", 105, finalY + 15);
      doc.setFont("helvetica", "normal");
      doc.text(String(below80), 137, finalY + 15);

      // Note (Threshold Warning)
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(220, 38, 38); // Red color for warning
      doc.text("* Note: Students with attendance below 80% should be monitored for attendance improvement.", 18, finalY + 23);

      // 4. Footer Section (Signature and Global Note)
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          const footerY = pageHeight - 25;

          if (i === totalPages) {
              if (profile.signature) {
                  try { doc.addImage(profile.signature, 'PNG', 14, footerY - 15, 35, 12); } catch (e) {}
              }
              doc.setDrawColor(...textColor);
              doc.line(14, footerY, 60, footerY);
              doc.setFontSize(10);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(...textColor);
              doc.text("Authorized Signature", 14, footerY + 6);
              doc.setFont("helvetica", "normal");
              doc.text(profile.instituteName || "TeacherAI System", 14, footerY + 11);
          }

          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...mutedColor);
          doc.text("System Generated Report", pageWidth - 14, footerY + 11, { align: "right" });

          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.text("This is an electronically generated attendance report and does not require a physical signature.", pageWidth / 2, pageHeight - 12, { align: 'center' });
      }

      doc.save(`Monthly_Attendance_Report_${batchName}_${selectedMonth}.pdf`);
    } catch (err) {
      console.error("PDF Error: ", err);
      alert("মাস্টার পিডিএফ জেনারেট করা যাচ্ছে না।");
    }
  };

  const getBadgeStyle = (percentage) => {
    if (percentage >= 80) return 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'; 
    if (percentage >= 50) return 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'; 
    return 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'; 
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        
        <div className="mb-[32px]">
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-[8px]">
            <span className="bg-gradient-to-br from-[#4F6DF5] to-[#6C4DF6] p-2.5 rounded-[12px] shadow-lg shadow-indigo-200">
               <CalendarDays className="text-white w-6 h-6" strokeWidth={2.5} />
            </span>
            Attendance History
          </h1>
          <p className="text-slate-500 font-medium text-[14px] ml-[52px]">
            Track and analyze monthly attendance performance
          </p>
        </div>

        <div className="bg-white p-[24px] rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex flex-wrap gap-6 mb-[32px] hover:-translate-y-[2px] transition-transform duration-200 ease-in-out">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[12px] font-bold text-[#6B7280] uppercase mb-2 tracking-[0.08em]">Select Batch</label>
            <select 
              className="w-full h-[44px] px-4 bg-white border border-[#E5E7EB] focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[10px] font-medium text-slate-700 outline-none transition-all cursor-pointer"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="">Choose Batch...</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[12px] font-bold text-[#6B7280] uppercase mb-2 tracking-[0.08em]">Select Month</label>
            <input 
              type="month" 
              className="w-full h-[44px] px-4 bg-white border border-[#E5E7EB] focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[10px] font-medium text-slate-700 outline-none transition-all cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button 
              onClick={fetchReport}
              className="h-[44px] bg-[#0F172A] text-white px-8 rounded-[10px] font-[600] flex items-center gap-2 hover:bg-[#1E293B] transition-all duration-200 ease-in-out hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)] active:scale-95"
            >
              <Search className="w-4 h-4" /> Show Report
            </button>
          </div>
        </div>

        {reportData.length > 0 ? (
          <div className="bg-white rounded-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-[#F1F5F9] overflow-hidden hover:-translate-y-[2px] transition-transform duration-200 ease-in-out">
            <div className="p-6 border-b border-[#F1F5F9] flex justify-between items-center">
              <h2 className="font-bold text-slate-800 text-[18px]">Monthly Summary</h2>
              <button 
                onClick={downloadMonthlyPDF}
                className="h-[44px] bg-[#10B981] text-white px-6 rounded-[10px] font-[600] flex items-center gap-2 hover:bg-[#059669] transition-all duration-200 ease-in-out hover:shadow-[0_6px_16px_rgba(16,185,129,0.2)] active:scale-95"
              >
                <Download className="w-4 h-4" /> Download Master PDF
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
                  <tr>
                    <th className="px-6 py-4 text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.08em] whitespace-nowrap">Student ID</th>
                    <th className="px-6 py-4 text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.08em] whitespace-nowrap">Name</th>
                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.08em] whitespace-nowrap">Total Classes</th>
                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#10B981] uppercase tracking-[0.08em] whitespace-nowrap">Present</th>
                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#EF4444] uppercase tracking-[0.08em] whitespace-nowrap">Absent</th>
                    <th className="px-6 py-4 text-right text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.08em] whitespace-nowrap">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {reportData.map((item, index) => (
                    <tr key={item.studentId || index} className="hover:bg-[#F9FAFB] transition-colors duration-200 h-[56px]">
                      <td className="px-6 font-bold text-[#4F6DF5]">{item.displayId}</td>
                      <td className="px-6 font-semibold text-slate-800">{item.studentName}</td>
                      <td className="px-6 text-center font-medium text-slate-500">{item.totalClasses}</td>
                      <td className="px-6 text-center font-bold text-[#10B981]">{item.presentDays}</td>
                      <td className="px-6 text-center font-bold text-[#EF4444]">{item.absentDays}</td>
                      <td className="px-6 text-right">
                        <span className={`px-[12px] py-[6px] rounded-[999px] text-[12px] font-[600] inline-block min-w-[70px] text-center ${getBadgeStyle(item.percentage)}`}>
                          {item.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[14px] border border-dashed border-[#E5E7EB] shadow-sm">
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-[#9CA3AF]" />
              </div>
              <h3 className="font-bold text-[#4B5563] text-lg">No Report Data</h3>
              <p className="text-[#6B7280] text-sm mt-1">Select a batch and month to view attendance history.</p>
            </div>
          )
        )}

        {loading && (
          <div className="flex justify-center items-center p-20">
             <div className="text-center font-bold text-[#4F6DF5] animate-pulse text-lg flex items-center gap-3">
               <div className="w-5 h-5 border-4 border-[#4F6DF5] border-t-transparent rounded-full animate-spin"></div>
               Generating Report...
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceHistory;