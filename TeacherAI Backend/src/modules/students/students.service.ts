import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose'; 
import { Student, StudentDocument } from './schemas/student.schema';
import { Batch, BatchDocument } from '../batches/schemas/batch.schema';
import { Attendance, AttendanceDocument } from '../attendance/schemas/attendance.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { Exam, ExamDocument } from '../exams/schemas/exam.schema';
import { Result, ResultDocument } from '../exams/schemas/result.schema';
import { Teacher, TeacherDocument } from '../auth/schemas/teacher.schema'; // 🚀 Teacher Schema ইম্পোর্ট করা হয়েছে
import * as puppeteer from 'puppeteer'; 
import * as QRCode from 'qrcode'; 

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Batch.name) private batchModel: Model<BatchDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Exam.name) private examModel: Model<ExamDocument>,
    @InjectModel(Result.name) private resultModel: Model<ResultDocument>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument> // 🚀 Teacher Model ইনজেক্ট করা হয়েছে
  ) {}

  async getStudentProfile(studentId: string, teacherId: string) {
    const sId = new Types.ObjectId(studentId);
    const tId = new Types.ObjectId(teacherId);

    const student = await this.studentModel
      .findOne({ _id: sId, teacherId: tId } as any)
      .populate('batchId')
      .exec();
      
    if (!student) throw new NotFoundException('Student not found');

    const attendanceData = await this.attendanceModel
      .find({ studentId: sId, teacherId: tId } as any)
      .sort({ date: 1 })
      .exec();

    const paymentData = await this.paymentModel
      .find({ studentId: sId, teacherId: tId } as any)
      .sort({ month: -1 })
      .exec();

    const resultsData = await this.resultModel
      .find({ 
        $or: [
          { studentId: sId }, 
          { studentId: student.studentId as any }
        ],
        teacherId: tId 
      } as any)
      .populate('examId')
      .sort({ createdAt: -1 })
      .exec();

    let totalObtainedMarks = 0; 
    let totalPossibleMarks = 0; 
    let validExamsCount = 0;
    
    const formattedResults = await Promise.all(resultsData.map(async (r: any) => {
      const exam = r.examId;
      if (!exam) return null;

      const isPresent = r.isPresent === true || String(r.isPresent).toLowerCase() === 'true';
      const examTotal = Number(exam.totalMarks) || 100;
      
      if (!isPresent) {
        return {
          examName: exam.title || 'Unknown Exam',
          examDate: exam.date || r.createdAt,
          marks: 0,
          totalMarks: examTotal,
          batchPosition: 'N/A',
          combinedMeritPosition: 'N/A',
          batchMedal: null,
          status: 'Absent'
        };
      }

      const myTotal = (Number(r.col1Marks) || 0) + (Number(r.col2Marks) || 0);
      
      totalObtainedMarks += myTotal;
      totalPossibleMarks += examTotal;
      validExamsCount += 1;

      const rankQuery: any = { 
        examId: exam._id,
        $or: [{ isPresent: true }, { isPresent: 'true' }] 
      };
      const allResultsForExam = await this.resultModel.find(rankQuery).exec();
      const allTotals = allResultsForExam.map((res: any) => (Number(res.col1Marks) || 0) + (Number(res.col2Marks) || 0));
      const uniqueTotals = [...new Set(allTotals)].sort((a: number, b: number) => b - a);
      const rank = uniqueTotals.indexOf(myTotal) + 1;

      return {
        examName: exam.title || 'Unknown Exam',
        examDate: exam.date || r.createdAt,
        marks: myTotal,
        totalMarks: examTotal,
        batchPosition: rank,
        combinedMeritPosition: rank,
        batchMedal: rank === 1 ? 'Gold' : rank === 2 ? 'Silver' : rank === 3 ? 'Bronze' : null,
        status: 'Present'
      };
    }));

    const cleanFormattedResults = formattedResults.filter((res): res is NonNullable<typeof res> => res !== null);

    const averageMarks = totalPossibleMarks > 0 
      ? Number(((totalObtainedMarks / totalPossibleMarks) * 100).toFixed(2)) 
      : 0;
      
    const presentCount = attendanceData.filter((a: any) => a.isPresent === true || String(a.isPresent).toLowerCase() === 'true').length;
    const attendanceRate = attendanceData.length > 0 ? Math.round((presentCount / attendanceData.length) * 100) : 0;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentPayment = paymentData.find((p: any) => p.month === currentMonth);

    return {
      basicInfo: student,
      summary: {
        attendanceRate,
        totalExams: validExamsCount, 
        averageMarks, 
        currentPaymentStatus: currentPayment ? currentPayment.status : 'Unpaid'
      },
      attendanceHistory: attendanceData,
      paymentHistory: paymentData,
      examHistory: cleanFormattedResults
    };
  }

  async generateStudentReportPdf(studentId: string, teacherId: string): Promise<Buffer> {
    const profile = await this.getStudentProfile(studentId, teacherId);
    const { basicInfo, summary, paymentHistory, examHistory, attendanceHistory } = profile;

    // 🚀 টিচারের ডাটা ফেচ করা হচ্ছে যাতে ব্র্যান্ডিং ডাইনামিক হয়
    const teacher = await this.teacherModel.findById(new Types.ObjectId(teacherId)).exec();
    const instName = teacher?.instituteName || 'ACADEMIC COACHING';
    const signatureUrl = teacher?.signature || '';

    const qrData = JSON.stringify({ studentId: basicInfo.studentId });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 100 });
    const photoUrl = basicInfo.photo || 'https://via.placeholder.com/150?text=No+Photo';

    const groupAttendanceByMonth = (history: any[]) => {
      if (!history || history.length === 0) return {};
      return history.reduce((acc, record) => {
        const monthYear = new Date(record.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        if (!acc[monthYear]) acc[monthYear] = { present: 0, absent: 0, total: 0 };
        acc[monthYear].total += 1;
        if (record.isPresent === true || String(record.isPresent).toLowerCase() === 'true') {
          acc[monthYear].present += 1;
        } else {
          acc[monthYear].absent += 1;
        }
        return acc;
      }, {});
    };
    
    const attendanceSummary = groupAttendanceByMonth(attendanceHistory);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: white;}
          .header { display: flex; justify-content: space-between; border-bottom: 3px solid #312e81; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 28px; font-weight: 900; color: #312e81; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
          .profile-section { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
          .profile-photo { width: 100px; height: 100px; border-radius: 12px; object-fit: cover; border: 2px solid #e2e8f0; }
          .info-block h2 { margin: 0 0 5px 0; font-size: 24px; color: #0f172a; }
          .info-block p { margin: 2px 0; font-size: 14px; color: #475569; }
          .stats-grid { display: flex; gap: 15px; margin-bottom: 30px; }
          .stat-box { flex: 1; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; }
          .stat-box.highlight { background: #e0e7ff; border-color: #c7d2fe; }
          .stat-label { font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-bottom: 5px; }
          .stat-value { font-size: 20px; font-weight: 900; color: #1e293b; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; font-weight: bold; color: #475569; text-transform: uppercase; }
          td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
          .section-title { font-size: 16px; font-weight: bold; color: #312e81; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px;}
          
          /* 🚀 নতুন ফুটার স্টাইল */
          .footer-section { margin-top: 50px; display: flex; flex-direction: column; align-items: flex-end; }
          .signature-box { text-align: center; min-width: 180px; }
          .signature-img { max-height: 60px; max-width: 150px; margin-bottom: 5px; }
          .signature-line { border-top: 2px solid #334155; margin-top: 5px; padding-top: 5px; font-size: 11px; font-weight: bold; color: #1e293b; }
          .auto-gen-notice { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #e2e8f0; font-style: italic; width: 100%; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${instName}</h1> <p class="subtitle">Official Student Performance Report • ${new Date().toLocaleDateString('en-GB')}</p>
          </div>
          <div>
            <img src="${qrCodeDataUrl}" alt="QR Code" />
          </div>
        </div>

        <div class="profile-section">
          <img src="${photoUrl}" class="profile-photo"/>
          <div class="info-block">
            <h2>${basicInfo.name}</h2>
            <p><strong>ID:</strong> ${basicInfo.studentId || 'N/A'}</p>
            <p><strong>Batch:</strong> ${(basicInfo.batchId as any)?.name || 'Unassigned'}</p>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-box"><p class="stat-label">Attendance</p><p class="stat-value">${summary.attendanceRate}%</p></div>
          <div class="stat-box"><p class="stat-label">Total Exams</p><p class="stat-value">${summary.totalExams}</p></div>
          <div class="stat-box highlight"><p class="stat-label">Average Marks</p><p class="stat-value" style="color:#4f46e5;">${summary.averageMarks}%</p></div>
          <div class="stat-box"><p class="stat-label">Status</p><p class="stat-value">${summary.currentPaymentStatus}</p></div>
        </div>

        <h3 class="section-title">Exam & Result History</h3>
        <table>
          <thead>
            <tr><th>Exam Name</th><th>Date</th><th>Marks</th><th>Percentage</th><th>Rank</th></tr>
          </thead>
          <tbody>
            ${examHistory.length > 0 ? examHistory.map((e: any) => `
              <tr>
                <td><strong>${e.examName}</strong></td>
                <td>${new Date(e.examDate).toLocaleDateString('en-GB')}</td>
                <td>${e.marks} / ${e.totalMarks}</td>
                <td>${e.totalMarks > 0 ? ((e.marks/e.totalMarks)*100).toFixed(1) : 0}%</td>
                <td>${e.batchPosition} ${e.batchMedal ? '('+e.batchMedal+')' : ''}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" style="text-align:center;">No exams recorded</td></tr>'}
          </tbody>
        </table>

        <div class="grid-2">
          <div>
             <h3 class="section-title">Recent Payments</h3>
             <table>
               <thead>
                 <tr><th>Month</th><th>Amount</th><th>Status</th></tr>
               </thead>
               <tbody>
                  ${paymentHistory.length > 0 ? paymentHistory.slice(0, 5).map((p: any) => `
                   <tr><td>${p.month}</td><td>৳${p.paidAmount}</td><td>${p.status}</td></tr>
                 `).join('') : '<tr><td colspan="3">No payments</td></tr>'}
               </tbody>
             </table>
          </div>
          <div>
            <h3 class="section-title">Attendance Summary</h3>
             <table>
               <thead>
                 <tr><th>Month</th><th>Total</th><th>Pres.</th><th>Abs.</th></tr>
               </thead>
               <tbody>
                  ${Object.keys(attendanceSummary).length > 0 ? Object.keys(attendanceSummary).slice(0,5).map((month) => `
                   <tr>
                     <td>${month}</td>
                     <td>${attendanceSummary[month].total}</td>
                     <td style="color: green;">${attendanceSummary[month].present}</td>
                     <td style="color: red;">${attendanceSummary[month].absent}</td>
                   </tr>
                 `).join('') : '<tr><td colspan="4">No records</td></tr>'}
               </tbody>
             </table>
          </div>
        </div>

        <div class="footer-section">
          <div class="signature-box">
            ${signatureUrl ? `<img src="${signatureUrl}" class="signature-img" />` : '<div style="height:60px;"></div>'}
            <div class="signature-line">Authorized Signature</div>
          </div>
        </div>

        <div class="auto-gen-notice">
          This report is electronically generated by ${instName} Management System and does not require a physical signature.
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    await browser.close();

    return Buffer.from(pdfBuffer);
  }

  async create(createDto: any, teacherId: string) {
    const studentData: any = { ...createDto, teacherId: new Types.ObjectId(teacherId) };
    if (createDto.batchId) studentData.batchId = new Types.ObjectId(createDto.batchId);
    const newStudent = new this.studentModel(studentData);
    return await newStudent.save();
  }

  async generateStudentId(batchId: string, year: string, teacherId: string) {
    const batch = await this.batchModel.findOne({ _id: new Types.ObjectId(batchId), teacherId: new Types.ObjectId(teacherId) } as any).exec();
    if (!batch) throw new NotFoundException('Batch not found');
    
    let batchCode = (batch as any).batchCode;
    if (!batchCode) {
      const batchName = (batch as any).name || '';
      const words = batchName.trim().split(/\s+/);
      batchCode = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : batchName.substring(0, 2).toUpperCase();
    }
    
    const count = await this.studentModel.countDocuments({ batchId: new Types.ObjectId(batchId), teacherId: new Types.ObjectId(teacherId) } as any);
    return `${batchCode}-${year}-${(count + 1).toString().padStart(3, '0')}`;
  }

  async assignToBatch(studentIds: string[], batchId: string, teacherId: string) {
    let modifiedCount = 0;
    for (const id of studentIds) {
      const student = await this.studentModel.findOne({ _id: new Types.ObjectId(id), teacherId: new Types.ObjectId(teacherId) } as any).exec();
      if (student && String(student.batchId) !== String(batchId)) {
        const admissionYear = new Date(student.admissionDate || Date.now()).getFullYear().toString();
        const newStudentId = await this.generateStudentId(batchId, admissionYear, teacherId);
        
        await this.studentModel.updateOne(
          { _id: new Types.ObjectId(id) } as any,
          { $set: { batchId: new Types.ObjectId(batchId), studentId: newStudentId } }
        );
        modifiedCount++;
      }
    }
    return { success: true, modifiedCount };
  }

  async findUnassigned(teacherId: string) {
    return await this.studentModel.find({ teacherId: new Types.ObjectId(teacherId), batchId: { $exists: false } } as any).sort({ name: 1 }).exec();
  }

  async findAll(teacherId: string, batchId?: string, activeOnly: boolean = false) {
    const query: any = { teacherId: new Types.ObjectId(teacherId) };
    if (batchId) query.batchId = new Types.ObjectId(batchId);
    if (activeOnly) query.status = { $in: ['Active', 'active'] };
    return await this.studentModel.find(query).populate('batchId', 'name').sort({ studentId: 1 }).exec();
  }

  async findOne(id: string, teacherId: string) {
    const student = await this.studentModel.findOne({ _id: new Types.ObjectId(id), teacherId: new Types.ObjectId(teacherId) } as any).populate('batchId').exec();
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async updatePhoto(id: string, photoUrl: string) {
    return await this.studentModel.findByIdAndUpdate(id, { photo: photoUrl }, { new: true }).exec();
  }

  async update(id: string, updateDto: any, teacherId: string) {
    const student = await this.studentModel.findOne({ _id: new Types.ObjectId(id), teacherId: new Types.ObjectId(teacherId) } as any).exec();
    if (!student) throw new NotFoundException('Student not found to update');

    const updateData = { ...updateDto };

    if (updateData.batchId && String(student.batchId) !== String(updateData.batchId)) {
      const admissionYear = new Date(student.admissionDate || Date.now()).getFullYear().toString();
      const newStudentId = await this.generateStudentId(updateData.batchId, admissionYear, teacherId);
      updateData.studentId = newStudentId;
    }

    return await this.studentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), teacherId: new Types.ObjectId(teacherId) } as any,
      { $set: updateData },
      { new: true }
    ).exec();
  }

  async toggleStatus(id: string, teacherId: string) {
    const student = await this.studentModel.findOne({ _id: new Types.ObjectId(id), teacherId: new Types.ObjectId(teacherId) } as any);
    if (!student) throw new NotFoundException('Student not found');
    const newStatus = (student.status || 'Active').toLowerCase() === 'active' ? 'Deactive' : 'Active';
    return await this.studentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), teacherId: new Types.ObjectId(teacherId) } as any,
      { $set: { status: newStatus } },
      { new: true }
    ).exec();
  }

  async remove(id: string, teacherId: string) {
    const deletedStudent = await this.studentModel.findOneAndDelete({ _id: new Types.ObjectId(id), teacherId: new Types.ObjectId(teacherId) } as any).exec();
    if (!deletedStudent) throw new NotFoundException('Student not found');
    return { message: 'Student removed successfully' };
  }
}