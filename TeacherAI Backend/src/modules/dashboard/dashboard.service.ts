import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Batch, BatchDocument } from '../batches/schemas/batch.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Attendance, AttendanceDocument } from '../attendance/schemas/attendance.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';

// 🚀 ফিক্স: শুধু Expense ইমপোর্ট করা হয়েছে, ExpenseDocument এর প্রয়োজন নেই
import { Expense } from '../expenses/expense.schema'; 

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Batch.name) private batchModel: Model<BatchDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    // 🚀 ফিক্স: Model<Expense> ব্যবহার করা হয়েছে
    @InjectModel(Expense.name) private expenseModel: Model<Expense>, 
  ) {}

  async getStats(teacherId: string, filterDate?: string) {
    if (!teacherId) {
      return { totalBatches: 0, totalStudents: 0, presentToday: 0, absentToday: 0, pendingPayments: 0, chartData: [], financialSummary: null };
    }

    const dateObj = new Date();
    dateObj.setHours(dateObj.getHours() + 6);
    const today = dateObj.toISOString().slice(0, 10);
    const currentMonth = dateObj.toISOString().slice(0, 7);

    // ১. একটিভ স্টুডেন্ট চেক
    const activeStudents = await this.studentModel.find({ teacherId: teacherId as any }).select('_id').exec();
    const activeStudentIds = activeStudents.map(student => student._id);
    const totalStudents = activeStudents.length;

    // ২. মোট ব্যাচ
    const totalBatches = await this.batchModel.countDocuments({ teacherId: teacherId as any });

    // ৩. ফিন্যান্সিয়াল সামারি (Income vs Expense)
    let totalIncome = 0;
    if (totalStudents > 0) {
      const allPayments = await this.paymentModel.find({
        teacherId: teacherId as any,
        studentId: { $in: activeStudentIds } as any
      }).exec();
      totalIncome = allPayments.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
    }

    const allExpenses = await this.expenseModel.find({ teacherId: teacherId as any }).exec();
    const totalExpense = allExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // ৪. এটেন্ডেন্স এবং পেমেন্ট কাউন্ট
    const [presentTodayCount, paidThisMonthCount] = await Promise.all([
      totalStudents > 0 ? this.attendanceModel.countDocuments({
        teacherId: teacherId as any,
        studentId: { $in: activeStudentIds } as any, 
        date: today,
        isPresent: true
      }) : 0,
      totalStudents > 0 ? this.paymentModel.countDocuments({
        teacherId: teacherId as any,
        studentId: { $in: activeStudentIds } as any, 
        month: currentMonth,
        status: 'Paid'
      }) : 0
    ]);

    const absentTodayCount = totalStudents - Number(presentTodayCount);
    const pendingCount = totalStudents - Number(paidThisMonthCount);

    // ৫. চার্ট ডাটা লজিক
    const currentMonthPayments = totalStudents > 0 ? await this.paymentModel.find({
      teacherId: teacherId as any,
      studentId: { $in: activeStudentIds } as any,
      month: currentMonth,
      status: { $in: ['Paid', 'Partial'] } 
    }).exec() : [];

    const dailyIncomeMap: Record<string, number> = {};
    currentMonthPayments.forEach(payment => {
      const pDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
      const dateString = pDate.toISOString().slice(0, 10); 
      dailyIncomeMap[dateString] = (dailyIncomeMap[dateString] || 0) + (Number(payment.paidAmount) || 0);
    });

    const chartData = Object.keys(dailyIncomeMap).map(dateStr => ({
      date: dateStr,
      amount: dailyIncomeMap[dateStr]
    }));

    return {
      totalBatches: totalBatches || 0,
      totalStudents: totalStudents,
      presentToday: presentTodayCount || 0,
      absentToday: absentTodayCount > 0 ? absentTodayCount : 0, 
      pendingPayments: pendingCount > 0 ? pendingCount : 0,
      financialSummary: {
        totalIncome: totalIncome,
        totalExpense: totalExpense,
        netProfit: totalIncome - totalExpense,
        currentBalance: totalIncome - totalExpense
      },
      chartData: chartData
    };
  }
}