import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema'; 
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { StudentStatusHistory, StudentStatusHistoryDocument } from './schemas/student-status-history.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(StudentStatusHistory.name) private statusHistoryModel: Model<StudentStatusHistoryDocument>
  ) {}

  async collectPayment(data: any, teacherId: string) {
    const { studentId, batchId, month, feeAmount, paidAmount, isDiscount } = data;

    if (!studentId || !batchId || !month) {
      throw new BadRequestException('Student ID, Batch ID and Month are required');
    }

    const fee = Number(feeAmount) || 0;
    const paid = Number(paidAmount) || 0;
    
    let discount = 0;
    let due = 0;
    let paymentStatus = 'Unpaid';

    if (paid >= fee && fee > 0) {
      paymentStatus = 'Paid';
      due = 0;
      discount = 0;
    } else if (paid > 0 && paid < fee) {
      if (isDiscount) {
        discount = fee - paid;
        due = 0;
        paymentStatus = 'Paid';
      } else {
        discount = 0;
        due = fee - paid;
        paymentStatus = 'Partial';
      }
    } else if (paid === 0) {
      if (isDiscount && fee > 0) {
        discount = fee;
        due = 0;
        paymentStatus = 'Paid';
      } else {
        due = fee;
        paymentStatus = 'Unpaid';
      }
    }

    return await this.paymentModel.findOneAndUpdate(
      { studentId, batchId, month, teacherId } as any,
      { 
        feeAmount: fee,
        paidAmount: paid,
        discountAmount: discount,
        dueAmount: due,
        status: paymentStatus, 
        paymentDate: new Date() 
      },
      { upsert: true, returnDocument: 'after' }
    );
  }

  // 🚀 FEATURE 4: INVOICE NUMBER SAFETY (Auto-increment)
  async generateInvoice(data: { studentId: string, batchId: string, billingMonth: string }, teacherId: string) {
    const { studentId, batchId, billingMonth } = data;

    const year = billingMonth ? billingMonth.split('-')[0] : new Date().getFullYear().toString();
    
    // ডেটাবেস থেকে এই বছরের সর্বশেষ ইনভয়েসটি খুঁজে বের করা
    const lastInvoice = await this.invoiceModel
      .findOne({ billingYear: year, teacherId: new Types.ObjectId(teacherId) } as any)
      .sort({ createdAt: -1 })
      .exec();

    let nextSequence = 1;
    if (lastInvoice && lastInvoice.invoiceId) {
      const parts = lastInvoice.invoiceId.split('-'); // e.g., ["INV", "2026", "00001"]
      if (parts.length === 3) {
        nextSequence = parseInt(parts[2], 10) + 1;
      }
    }
    
    // ৫ ডিজিটের ইউনিক ফরম্যাট তৈরি করা (INV-2026-00001)
    const sequenceStr = nextSequence.toString().padStart(5, '0');
    const invoiceId = `INV-${year}-${sequenceStr}`;

    const paymentRecord = await this.paymentModel.findOne({ 
      studentId: new Types.ObjectId(studentId), 
      month: billingMonth, 
      teacherId: new Types.ObjectId(teacherId) 
    } as any).exec();

    const monthlyFee = paymentRecord ? paymentRecord.feeAmount : 0;
    const amountPaid = paymentRecord ? paymentRecord.paidAmount : 0;
    const amountDue = paymentRecord ? paymentRecord.dueAmount : 0;
    const status = paymentRecord ? paymentRecord.status : 'Unpaid';

    const newInvoice = new this.invoiceModel({
      invoiceId,
      studentId: new Types.ObjectId(studentId),
      batchId: new Types.ObjectId(batchId),
      teacherId: new Types.ObjectId(teacherId),
      billingMonth,
      billingYear: year,
      monthlyFee,
      amountPaid,
      amountDue,
      status,
      generatedDate: new Date()
    });

    await newInvoice.save();

    return {
      success: true,
      invoiceId: invoiceId, 
      message: 'Invoice successfully generated and saved to database!',
      record: paymentRecord
    };
  }

  async getMonthlyPayments(batchId: string, month: string, teacherId: string) {
    return await this.paymentModel.find({ batchId, month, teacherId } as any).exec();
  }

  async findByStudent(studentId: string, teacherId: string) {
    return await this.paymentModel.find({ studentId, teacherId } as any).sort({ paymentDate: -1 }).exec();
  }

  async getAllPayments(teacherId: string) {
    const activeStudents = await this.studentModel.find({ teacherId: teacherId as any }).select('_id').exec();
    const activeStudentIds = activeStudents.map(student => student._id.toString());

    if (activeStudentIds.length === 0) return [];

    return await this.paymentModel.find({ 
        teacherId,
        studentId: { $in: activeStudentIds },
        status: { $ne: 'Unpaid' },
        paidAmount: { $gt: 0 } 
    } as any).exec();
  }
}