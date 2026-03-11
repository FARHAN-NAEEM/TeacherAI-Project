import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { 
  Download, 
  Receipt, 
  Search, 
  CalendarDays, 
  Users, 
  CheckCircle2, 
  Clock, 
  Banknote,
  X,
  Info
} from 'lucide-react';

function Payments() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [students, setStudents] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState({}); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allGlobalStudents, setAllGlobalStudents] = useState([]); 
  const [searchedStudent, setSearchedStudent] = useState(null); 
  const [studentPaymentTimeline, setStudentPaymentTimeline] = useState([]); 

  // 🚀 Selected Student state for Invoice Generation
  const [selectedTableStudent, setSelectedTableStudent] = useState(null);

  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    student: null,
    amount: '',
    method: 'Instant Payment',
    showDiscountPrompt: false
  });

  const [teacherProfile, setTeacherProfile] = useState({ instituteName: '', signature: '', logo: '' });
  const token = localStorage.getItem('teacherToken');

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/batches', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => setBatches(data.data || data));

    fetch('http://localhost:3000/api/v1/students', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => setAllGlobalStudents(data.data || data || []));

    fetch('http://localhost:3000/api/v1/auth/profile', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setTeacherProfile({
          instituteName: data.instituteName || 'TeacherAI System',
          signature: data.signature || '',
          logo: data.logo || '' 
        });
      }).catch(err => console.error(err));
  }, [token]);

  const fetchData = async () => {
    if (!selectedBatch) return;
    try {
      setLoading(true);
      setSelectedTableStudent(null); 
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const stRes = await fetch(`http://localhost:3000/api/v1/students?batchId=${selectedBatch}`, { headers });
      const rawStudentsData = await stRes.json();
      const allStudents = rawStudentsData.data || rawStudentsData;

      const payRes = await fetch(`http://localhost:3000/api/v1/payments/monthly?batchId=${selectedBatch}&month=${currentMonth}`, { headers });
      const payments = await payRes.json();
      
      const payMap = {};
      
      (payments.data || payments).forEach(p => { 
        if(p.status !== 'Unpaid') {
           payMap[p.studentId] = { 
               status: p.status, 
               paidAmount: p.paidAmount, 
               dueAmount: p.dueAmount,
               discountAmount: p.discountAmount || 0,
               date: p.paymentDate || p.updatedAt || p.createdAt || p.date,
               method: p.method || 'Instant Payment'
           }; 
        }
      });

      const filteredStudents = allStudents.filter(student => {
        const isActive = (student.status || 'Active').toLowerCase() === 'active';
        const hasPaymentRecord = !!payMap[student._id];
        return isActive || hasPaymentRecord;
      });

      setStudents(filteredStudents);
      setPaymentHistory(payMap);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [selectedBatch, currentMonth]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchedStudent(null);
      return;
    }
    const query = searchQuery.toLowerCase();
    const found = allGlobalStudents.find(s => 
      s.name.toLowerCase().includes(query) || 
      (s.studentId && s.studentId.toLowerCase().includes(query)) ||
      (s.roll && s.roll.toLowerCase().includes(query))
    );

    if (found) {
      setSearchedStudent(found);
      fetchStudentTimeline(found._id);
    } else {
      setSearchedStudent(null);
    }
  }, [searchQuery, allGlobalStudents]);

  const fetchStudentTimeline = async (studentId) => {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/payments/student/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStudentPaymentTimeline(data.data || data || []);
    } catch (error) {
      console.error("Timeline Fetch Error", error);
    }
  };

  const openPaymentModal = (student) => {
    const batchFee = batches.find(b => b._id === (student.batchId?._id || student.batchId || selectedBatch))?.fee || 0;
    setPaymentModal({
      isOpen: true,
      student: student,
      amount: batchFee,
      method: 'Instant Payment',
      showDiscountPrompt: false
    });
  };

  const closePaymentModal = () => {
    setPaymentModal({ isOpen: false, student: null, amount: '', method: 'Instant Payment', showDiscountPrompt: false });
  };

  const processPaymentSubmission = async (isDiscountSelected = false) => {
    const { student, amount, method } = paymentModal;
    const batchFee = batches.find(b => b._id === (student.batchId?._id || student.batchId || selectedBatch))?.fee || 0;
    const paidAmt = Number(amount);
    
    if (paidAmt <= 0) return alert("Please enter a valid amount!");

    if (paidAmt < batchFee && !paymentModal.showDiscountPrompt && !isDiscountSelected) {
      setPaymentModal(prev => ({ ...prev, showDiscountPrompt: true }));
      return;
    }

    const currentPaymentDate = new Date().toISOString(); 
    
    try {
      const response = await fetch('http://localhost:3000/api/v1/payments/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          studentId: student._id, 
          batchId: student.batchId?._id || student.batchId || selectedBatch, 
          month: currentMonth, 
          feeAmount: batchFee, 
          paidAmount: paidAmt, 
          isDiscount: isDiscountSelected, 
          paymentDate: currentPaymentDate,
          method: method
        })
      });

      if (response.ok) {
        setMessage({ text: '✅ Payment Recorded Successfully!', type: 'success' });
        
        const status = isDiscountSelected || paidAmt >= batchFee ? 'Paid' : 'Partial';
        const dueAmount = isDiscountSelected ? 0 : (batchFee - paidAmt);
        const discountAmount = isDiscountSelected ? (batchFee - paidAmt) : 0;
        
        setPaymentHistory(prev => ({
          ...prev,
          [student._id]: { status, paidAmount: paidAmt, dueAmount, discountAmount, date: currentPaymentDate, method }
        }));

        closePaymentModal();
        
        if (method === 'Generate Invoice') {
          setTimeout(() => generateInvoice(student), 500); 
        }

        if (selectedBatch) fetchData(); 
        if (searchedStudent) fetchStudentTimeline(searchedStudent._id); 
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } else {
        setMessage({ text: '❌ Failed to record payment.', type: 'error' });
      }
    } catch (error) { 
      setMessage({ text: '❌ Server Error!', type: 'error' });
    }
  };

  const undoPayment = async (studentId) => {
    if(!window.confirm("Are you sure you want to undo this payment?")) return;
    
    const feeAmount = batches.find(b => b._id === selectedBatch)?.fee || 0;
    try {
      const response = await fetch('http://localhost:3000/api/v1/payments/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          studentId, batchId: selectedBatch, month: currentMonth, feeAmount, paidAmount: 0, isDiscount: false
        })
      });

      if (response.ok) {
        setMessage({ text: '⚠️ Payment Reverted to Unpaid!', type: 'info' });
        fetchData();
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch(err) { console.error(err); }
  };

  // 🚀 FIX: Robust Fail-Safe Invoice PDF Generation
  const generateInvoice = async (targetStudent = selectedTableStudent || searchedStudent) => {
    if (!targetStudent) return;
    
    let invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    
    try {
      const res = await fetch('http://localhost:3000/api/v1/payments/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          studentId: targetStudent._id,
          batchId: targetStudent.batchId?._id || targetStudent.batchId,
          billingMonth: currentMonth
        })
      });
      if (res.ok) {
        const invoiceData = await res.json();
        if (invoiceData.invoiceId) invoiceId = invoiceData.invoiceId;
      }
    } catch (apiErr) {
      console.warn("Backend API not reachable. Proceeding with local Invoice ID.");
    }

    try {
      const historyRecord = paymentHistory[targetStudent._id];
      const batchFee = batches.find(b => b._id === (targetStudent.batchId?._id || targetStudent.batchId || selectedBatch))?.fee || 0;
      
      const paidAmt = historyRecord ? historyRecord.paidAmount : 0;
      const status = historyRecord ? historyRecord.status : 'Unpaid';
      const discount = historyRecord ? historyRecord.discountAmount || 0 : 0;
      const due = historyRecord ? historyRecord.dueAmount || (status === 'Unpaid' ? batchFee : 0) : 0; // fallback to 0 if paid
      const payDate = historyRecord?.date ? new Date(historyRecord.date).toLocaleDateString('en-GB') : '—';

      const doc = new jsPDF();
      
      // 🚀 Safe page dimensions
      const pageSize = doc.internal.pageSize;
      const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

      const primaryColor = [37, 99, 235]; 
      const textColor = [31, 41, 55]; 
      const mutedColor = [107, 114, 128]; 

      // Top Strip
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 6, 'F');

      let startY = 25;
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(teacherProfile.instituteName || "TeacherAI System", 14, startY);
      
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text("FEE INVOICE", 14, startY + 8);
      
      // Right Meta
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      doc.text(`Invoice ID: ${invoiceId}`, pageWidth - 14, 20, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedColor);
      doc.text(`Billing Month: ${new Date(currentMonth).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'})}`, pageWidth - 14, 26, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 14, 32, { align: "right" });

      // Student Info Box
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(14, startY + 18, pageWidth - 28, 32, 2, 2, 'FD');

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text("BILLED TO:", 18, startY + 26);
      
      doc.setFontSize(12);
      doc.setTextColor(...textColor);
      doc.text(targetStudent.name || 'Student Name', 18, startY + 34);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedColor);
      doc.text(`Student ID: ${targetStudent.studentId || targetStudent.roll || 'N/A'}`, 18, startY + 40);
      doc.text(`Batch: ${batches.find(b => b._id === (targetStudent.batchId?._id || targetStudent.batchId || selectedBatch))?.name || 'N/A'}`, 18, startY + 46);

      // Payment Details Table
      autoTable(doc, {
        startY: startY + 58,
        head: [['Description', 'Payment Date', 'Status', 'Amount']],
        body: [
          ['Monthly Batch Fee', payDate, String(status).toUpperCase(), `BDT ${paidAmt}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        bodyStyles: { textColor: textColor },
        styles: { cellPadding: 6, fontSize: 10 },
      });

      // 🚀 Safe Table Height Calculation
      let finalY = 150;
      if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
        finalY = doc.lastAutoTable.finalY + 15;
      } else if (doc.autoTable && doc.autoTable.previous && doc.autoTable.previous.finalY) {
        finalY = doc.autoTable.previous.finalY + 15;
      }

      // Summary Box
      const summaryX = pageWidth - 90;
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(summaryX, finalY, 76, 45, 2, 2, 'FD');

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...mutedColor);
      doc.text("Fee Amount:", summaryX + 6, finalY + 10);
      doc.setTextColor(...textColor);
      doc.text(`BDT ${batchFee}`, pageWidth - 20, finalY + 10, { align: "right" });

      doc.setTextColor(...mutedColor);
      doc.text("Paid Amount:", summaryX + 6, finalY + 18);
      doc.setTextColor(22, 163, 74); 
      doc.text(`BDT ${paidAmt}`, pageWidth - 20, finalY + 18, { align: "right" });

      doc.setTextColor(...mutedColor);
      doc.text("Discount:", summaryX + 6, finalY + 26);
      doc.setTextColor(...textColor);
      doc.text(`BDT ${discount}`, pageWidth - 20, finalY + 26, { align: "right" });

      doc.setDrawColor(229, 231, 235);
      doc.line(summaryX + 6, finalY + 31, pageWidth - 20, finalY + 31); 

      doc.setTextColor(...primaryColor);
      doc.text("Due Amount:", summaryX + 6, finalY + 38);
      doc.setTextColor(220, 38, 38); 
      doc.text(`BDT ${due}`, pageWidth - 20, finalY + 38, { align: "right" });

      // Footer
      const footerY = pageHeight - 30;
      
      // 🚀 Safe Signature Image Loading
      if (teacherProfile.signature) {
        try { 
          let imgFormat = 'PNG';
          if (teacherProfile.signature.includes('jpeg') || teacherProfile.signature.includes('jpg')) imgFormat = 'JPEG';
          doc.addImage(teacherProfile.signature, imgFormat, 14, footerY - 15, 35, 12); 
        } catch(e) {}
      }
      doc.setDrawColor(...textColor);
      doc.line(14, footerY, 60, footerY); 
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text("Authorized Signature", 14, footerY + 6);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...mutedColor);
      doc.text("This is an electronically generated invoice and does not require a physical signature.", pageWidth / 2, pageHeight - 15, { align: 'center' });

      doc.save(`${targetStudent.name || 'Student'}_Invoice_${currentMonth}.pdf`);
    } catch (err) {
      console.error("PDF Generation Crash:", err);
      alert("Failed to generate PDF: " + err.message);
    }
  };

  const downloadIncomeReport = () => {
    if(!selectedBatch || students.length === 0) return alert("Please select a batch with students first.");

    const batchInfo = batches.find(b => b._id === selectedBatch);
    const batchName = batchInfo?.name || 'N/A';
    const batchFee = batchInfo?.fee || 0;

    let totalPaidStudents = 0;
    let totalPartial = 0;
    let totalUnpaid = 0;
    let totalCollected = 0;
    let totalDiscountsGiven = 0;
    let totalDueAmount = 0;

    const tableRows = [];

    students.forEach(s => {
      const history = paymentHistory[s._id];
      let status = 'Unpaid';
      let paid = 0;
      let due = batchFee;

      if (!history || history.status === 'Unpaid') {
        totalUnpaid++;
        totalDueAmount += batchFee;
      } else if (history.status === 'Paid') {
        status = 'Paid';
        paid = Number(history.paidAmount);
        due = 0;
        totalPaidStudents++;
        totalCollected += paid;
        totalDiscountsGiven += Number(history.discountAmount || 0);
      } else if (history.status === 'Partial') {
        status = 'Partial';
        paid = Number(history.paidAmount);
        due = Number(history.dueAmount || (batchFee - paid));
        totalPartial++;
        totalCollected += paid;
        totalDueAmount += due;
      }

      tableRows.push([
        s.name,
        s.studentId || s.roll || 'N/A',
        status.toUpperCase(),
        `BDT ${paid}`,
        `BDT ${due}`
      ]);
    });

    const doc = new jsPDF();
    const pageSize = doc.internal.pageSize;
    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("MONTHLY INCOME REPORT", 14, 16);
    
    doc.setFontSize(10);
    doc.text(`Batch: ${batchName}`, pageWidth - 14, 12, { align: "right" });
    doc.text(`Month: ${new Date(currentMonth).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'})}`, pageWidth - 14, 18, { align: "right" });

    const startY = 35;
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.text("Revenue & Status Summary", 14, startY);

    const drawBox = (x, y, w, title, value, color) => {
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(x, y, w, 22, 2, 2, 'FD');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(title, x + (w/2), y + 8, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...color);
      doc.text(String(value), x + (w/2), y + 16, { align: 'center' });
    };

    const boxW = (pageWidth - 28 - 15) / 4;
    
    drawBox(14, startY + 5, boxW, "Total Students", students.length, [31, 41, 55]);
    drawBox(14 + boxW + 5, startY + 5, boxW, "Full Paid", totalPaidStudents, [22, 163, 74]);
    drawBox(14 + (boxW*2) + 10, startY + 5, boxW, "Partial Paid", totalPartial, [217, 119, 6]);
    drawBox(14 + (boxW*3) + 15, startY + 5, boxW, "Unpaid", totalUnpaid, [220, 38, 38]);

    const boxW3 = (pageWidth - 28 - 10) / 3;
    drawBox(14, startY + 32, boxW3, "Total Collected", `BDT ${totalCollected}`, [37, 99, 235]);
    drawBox(14 + boxW3 + 5, startY + 32, boxW3, "Total Due", `BDT ${totalDueAmount}`, [220, 38, 38]);
    drawBox(14 + (boxW3*2) + 10, startY + 32, boxW3, "Total Discount", `BDT ${totalDiscountsGiven}`, [107, 114, 128]);

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.text("Student Payment Breakdown", 14, startY + 65);

    autoTable(doc, {
      startY: startY + 70,
      head: [['Student Name', 'Student ID', 'Status', 'Paid Amount', 'Due Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
      styles: { cellPadding: 5, fontSize: 9.5 },
      didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 2) {
              if (data.cell.raw === 'UNPAID') data.cell.styles.textColor = [220, 38, 38];
              if (data.cell.raw === 'PARTIAL') data.cell.styles.textColor = [217, 119, 6];
              if (data.cell.raw === 'PAID') data.cell.styles.textColor = [22, 163, 74];
          }
      },
    });

    doc.save(`Income_Report_${batchName}_${currentMonth}.pdf`);
  };

  const totalStudents = students.length;
  let paidCount = 0;
  let pendingCount = 0;
  let totalCollected = 0;

  students.forEach(s => {
    const history = paymentHistory[s._id];
    if (history && history.status === 'Paid') {
      paidCount++;
      totalCollected += Number(history.paidAmount);
    } else if (history && history.status === 'Partial') {
      pendingCount++;
      totalCollected += Number(history.paidAmount);
    } else {
      pendingCount++;
    }
  });

  // Check if any student is selected to activate invoice button
  const isAnySelected = selectedTableStudent || searchedStudent;

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h1 className="text-[32px] font-black text-slate-900 tracking-tight leading-none mb-1">Fee Management</h1>
            <p className="text-slate-500 font-medium text-[14px]">Track student payments and dues</p>
          </div>
          <div className="flex gap-4">
            <button onClick={downloadIncomeReport} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-[10px] font-bold text-[13px] shadow-sm hover:bg-slate-50 transition-all active:scale-95">
              <Download className="w-4 h-4" /> Download Income Report
            </button>
            <button 
              onClick={() => generateInvoice(selectedTableStudent || searchedStudent)} 
              disabled={!isAnySelected}
              // 🚀 UX IMPROVEMENT: Active Glow when a student is selected
              className={`flex items-center gap-2 px-6 py-2.5 rounded-[10px] font-bold text-[13px] transition-all active:scale-95 ${
                isAnySelected 
                  ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-600 hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Receipt className="w-4 h-4" /> Generate Invoice
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-[12px] text-center font-bold shadow-sm border animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : message.type === 'info' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
            {message.text}
          </div>
        )}
        
        <div className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-100 flex flex-wrap gap-6 mb-8">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Select Batch</label>
            <select 
              className="w-full h-[44px] px-4 bg-slate-50 border border-slate-200 focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[10px] font-semibold text-slate-700 outline-none transition-all cursor-pointer"
              value={selectedBatch} 
              onChange={(e) => setSelectedBatch(e.target.value)} 
              disabled={searchQuery.length > 0}
            >
              <option value="">Choose Batch...</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name} (৳{b.fee})</option>)}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Billing Month</label>
            <div className="relative">
              <input 
                type="month" 
                className="w-full h-[44px] pl-10 pr-4 bg-slate-50 border border-slate-200 focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[10px] font-semibold text-slate-700 outline-none transition-all cursor-pointer"
                value={currentMonth} 
                onChange={(e) => setCurrentMonth(e.target.value)} 
              />
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="flex-[2] min-w-[300px]">
            <label className="block text-[11px] font-bold text-[#4F6DF5] uppercase tracking-widest mb-2 ml-1">Search Student (Name / ID)</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search to view profile & invoice..."
                className="w-full h-[44px] pl-10 pr-4 bg-indigo-50/30 border border-indigo-100 focus:border-[#4F6DF5] focus:bg-white rounded-[10px] font-semibold text-slate-800 outline-none transition-all"
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4F6DF5]" />
            </div>
          </div>
        </div>

        {searchedStudent ? (
          <div className="bg-white rounded-[16px] shadow-sm border border-indigo-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
             <div className="bg-gradient-to-r from-[#4F6DF5] to-[#6C4DF6] p-8 flex flex-col md:flex-row justify-between items-start md:items-center text-white gap-4">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black uppercase backdrop-blur-sm border-2 border-white/30">
                      {searchedStudent.name.charAt(0)}
                   </div>
                   <div>
                      <h2 className="text-2xl font-black tracking-tight">{searchedStudent.name}</h2>
                      <p className="font-semibold text-indigo-100 text-sm mt-0.5 tracking-wide">ID: {searchedStudent.studentId || searchedStudent.roll} • {searchedStudent.status || 'Active'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button 
                     onClick={() => openPaymentModal(searchedStudent)} 
                     className="bg-emerald-500 text-white px-6 py-3 rounded-[10px] font-bold text-[13px] shadow-lg hover:bg-emerald-400 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
                  >
                     ⚡ Record Payment
                  </button>
                </div>
             </div>
             
             <div className="p-8">
                <h3 className="font-black text-slate-800 text-[16px] uppercase tracking-tight mb-6">Payment Timeline History</h3>
                {studentPaymentTimeline.length > 0 ? (
                   <div className="space-y-3">
                      {studentPaymentTimeline.map((record, index) => (
                         <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-[12px] border border-slate-100">
                            <div className="flex items-center gap-4">
                               <div className={`w-2.5 h-2.5 rounded-full ${record.status === 'Paid' ? 'bg-emerald-500' : record.status === 'Partial' ? 'bg-orange-500' : 'bg-rose-500'}`}></div>
                               <div>
                                 <div className="font-bold text-slate-700">{new Date(record.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
                                 <div className="text-[11px] font-semibold text-slate-400">{new Date(record.paymentDate || record.createdAt).toLocaleDateString('en-GB')} • {record.method || 'Instant'}</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <span className={`px-3 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-widest ${record.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : record.status === 'Partial' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700'}`}>
                                 {record.status}
                               </span>
                               <span className="font-black text-slate-900 text-lg">৳{record.paidAmount || 0}</span>
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <p className="text-center text-slate-400 font-bold py-10 text-sm">No payment history found for this student.</p>
                )}
             </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-5 rounded-[14px] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#4F6DF5] flex items-center justify-center"><Users size={20} /></div>
                <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Students</p><h4 className="text-xl font-black text-slate-800">{totalStudents}</h4></div>
              </div>
              <div className="bg-white p-5 rounded-[14px] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><CheckCircle2 size={20} /></div>
                <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Paid</p><h4 className="text-xl font-black text-slate-800">{paidCount}</h4></div>
              </div>
              <div className="bg-white p-5 rounded-[14px] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><Clock size={20} /></div>
                <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pending</p><h4 className="text-xl font-black text-slate-800">{pendingCount}</h4></div>
              </div>
              <div className="bg-white p-5 rounded-[14px] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><Banknote size={20} /></div>
                <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Collected</p><h4 className="text-xl font-black text-slate-800">৳{totalCollected}</h4></div>
              </div>
            </div>

            <div className="bg-white rounded-[16px] shadow-sm border border-slate-100 overflow-hidden relative">
              {loading && (
                 <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                   <span className="font-bold text-[#4F6DF5] text-sm animate-pulse">Loading Data...</span>
                 </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#F8FAFC] border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student Info</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Date</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.length > 0 ? students.map(s => {
                      const history = paymentHistory[s._id];
                      const isFullyPaid = history?.status === 'Paid';
                      const statusText = history ? history.status : 'Unpaid';
                      const paymentDateDisplay = history?.date ? new Date(history.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                      
                      const batchFee = batches.find(b => b._id === selectedBatch)?.fee || 0;
                      const displayAmount = history ? history.paidAmount : batchFee;
                      const dueAmount = history ? history.dueAmount : batchFee;

                      // 🚀 UX IMPROVEMENT: Active Row Highlight
                      const isSelected = selectedTableStudent?._id === s._id;

                      return (
                        <tr 
                          key={s._id} 
                          onClick={() => setSelectedTableStudent(s)}
                          className={`transition-all h-[64px] cursor-pointer border-l-4 ${isSelected ? 'bg-indigo-50/70 border-[#4F6DF5]' : 'hover:bg-slate-50/50 border-transparent'}`}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                               {/* 🚀 UX IMPROVEMENT: Indicator Dot */}
                               <div className={`w-2 h-2 rounded-full transition-all ${isSelected ? 'bg-[#4F6DF5] shadow-[0_0_8px_rgba(79,109,245,0.6)]' : 'bg-transparent'}`}></div>
                               <div>
                                  <div className="font-bold text-slate-800 text-[14px]">{s.name}</div>
                                  <div className="text-slate-400 text-[11px] font-medium mt-0.5 tracking-wide">ID: {s.studentId || s.roll || 'N/A'}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-widest border ${
                                statusText === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                statusText === 'Partial' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                'bg-rose-50 text-rose-500 border-rose-100'
                              }`}>
                                {statusText}
                              </span>
                              {statusText === 'Partial' && <span className="text-[10px] font-bold text-rose-500 ml-1">Due: ৳{dueAmount}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-[13px] font-medium text-slate-600">
                            {paymentDateDisplay}
                          </td>
                          <td className="px-6 py-3 font-bold text-slate-800">
                            ৳{displayAmount}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {isFullyPaid || statusText === 'Partial' ? (
                              <button onClick={(e) => { e.stopPropagation(); undoPayment(s._id); }} className="bg-white border border-slate-200 text-slate-500 hover:text-rose-500 hover:border-rose-200 px-4 py-2 rounded-[8px] font-bold text-[11px] uppercase tracking-wider transition-all">
                                Undo
                              </button>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); openPaymentModal(s); }} className="bg-[#4F6DF5] text-white px-5 py-2 rounded-[8px] font-bold text-[11px] uppercase tracking-wider shadow-sm hover:bg-[#435EE0] transition-all">
                                Record Payment
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-16 text-center text-slate-400 font-medium">
                          {selectedBatch ? "No students found in this batch." : "Select a batch to view students."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 5️⃣ RECORD PAYMENT MODAL */}
        {paymentModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-[20px] shadow-2xl max-w-md w-full border border-slate-100 relative">
               <button onClick={closePaymentModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-full"><X size={18}/></button>
               
               {paymentModal.showDiscountPrompt ? (
                 <div className="animate-in slide-in-from-right-4 duration-300">
                    <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-4"><Info size={24} /></div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Wait a minute!</h2>
                    <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed">
                      You are entering an amount (<span className="font-bold text-rose-500">৳{paymentModal.amount}</span>) lower than the batch fee (<span className="font-bold text-slate-800">৳{batches.find(b => b._id === (paymentModal.student?.batchId?._id || paymentModal.student?.batchId || selectedBatch))?.fee || 0}</span>).<br/><br/>Please select how this payment should be handled:
                    </p>
                    <div className="flex flex-col gap-3">
                      <button onClick={() => processPaymentSubmission(false)} className="w-full bg-orange-50 border border-orange-200 text-orange-600 font-bold py-3.5 rounded-[10px] hover:bg-orange-100 transition-colors flex items-center justify-center gap-2">
                        Partial Payment <span className="text-[10px] font-normal opacity-80">(Student still has due)</span>
                      </button>
                      <button onClick={() => processPaymentSubmission(true)} className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-[10px] shadow-md shadow-emerald-200 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                        Special Discount <span className="text-[10px] font-normal opacity-90">(Waive remaining amount)</span>
                      </button>
                    </div>
                 </div>
               ) : (
                 <div className="animate-in fade-in duration-200">
                   <h2 className="text-xl font-black text-slate-800 mb-1">Record Payment</h2>
                   <p className="text-sm text-slate-500 font-medium mb-6">Enter payment details for {paymentModal.student?.name}</p>

                   <div className="space-y-4 mb-6">
                     <div>
                       <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Billing Month</label>
                       <input type="text" value={new Date(currentMonth).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'})} disabled className="w-full p-3 bg-slate-50 border border-slate-200 rounded-[10px] font-bold text-slate-500 cursor-not-allowed" />
                     </div>
                     <div>
                       <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount (BDT)</label>
                       <input type="number" value={paymentModal.amount} onChange={(e) => setPaymentModal({...paymentModal, amount: e.target.value})} className="w-full p-3 bg-white border border-slate-200 focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[10px] font-black text-slate-800 outline-none transition-all text-lg" />
                     </div>
                     <div>
                       <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2">Payment Method</label>
                       <div className="flex gap-3">
                         <label className="flex-1 cursor-pointer">
                           <input type="radio" name="method" value="Instant Payment" checked={paymentModal.method === 'Instant Payment'} onChange={(e) => setPaymentModal({...paymentModal, method: e.target.value})} className="peer hidden" />
                           <div className="text-center p-3 border-2 border-slate-100 rounded-[10px] peer-checked:border-[#4F6DF5] peer-checked:bg-indigo-50 font-bold text-[13px] text-slate-600 peer-checked:text-[#4F6DF5] transition-all">Instant</div>
                         </label>
                         <label className="flex-1 cursor-pointer">
                           <input type="radio" name="method" value="Generate Invoice" checked={paymentModal.method === 'Generate Invoice'} onChange={(e) => setPaymentModal({...paymentModal, method: e.target.value})} className="peer hidden" />
                           <div className="text-center p-3 border-2 border-slate-100 rounded-[10px] peer-checked:border-emerald-500 peer-checked:bg-emerald-50 font-bold text-[13px] text-slate-600 peer-checked:text-emerald-600 transition-all">Invoice</div>
                         </label>
                       </div>
                     </div>
                   </div>

                   <div className="flex gap-3">
                     <button onClick={closePaymentModal} className="flex-1 bg-slate-50 text-slate-600 font-bold py-3.5 rounded-[10px] hover:bg-slate-100 transition-colors">Cancel</button>
                     <button onClick={() => processPaymentSubmission(false)} className="flex-1 bg-[#4F6DF5] text-white font-bold py-3.5 rounded-[10px] shadow-lg shadow-indigo-200 hover:bg-[#435EE0] transition-colors active:scale-95">Confirm</button>
                   </div>
                 </div>
               )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Payments;