import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true })
  studentId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true })
  batchId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: string;

  @Prop({ required: true })
  month: string; // e.g., "2026-03"

  // ১. ব্যাচের নির্ধারিত মূল ফি
  @Prop({ required: true })
  feeAmount: number;

  // ২. স্টুডেন্ট কত টাকা জমা দিয়েছে
  @Prop({ required: true, default: 0 })
  paidAmount: number;

  // ৩. বিশেষ ছাড় (আপনার স্পেশাল স্টুডেন্টদের জন্য)
  @Prop({ default: 0 })
  discountAmount: number;

  // ৪. বকেয়া কত আছে
  @Prop({ required: true, default: 0 })
  dueAmount: number;

  // ৫. পেমেন্ট স্ট্যাটাস
  @Prop({ required: true, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' })
  status: string;

  @Prop({ default: Date.now })
  paymentDate: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);