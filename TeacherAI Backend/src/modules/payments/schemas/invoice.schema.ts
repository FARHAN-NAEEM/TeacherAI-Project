import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true })
  invoiceId: string;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: Types.ObjectId;

  @Prop({ required: true })
  billingMonth: string; // Format: YYYY-MM

  @Prop({ required: true })
  billingYear: string; // Format: YYYY

  @Prop({ required: true, default: 0 })
  monthlyFee: number;

  @Prop({ required: true, default: 0 })
  amountPaid: number;

  @Prop({ required: true, default: 0 })
  amountDue: number;

  @Prop({ required: true, default: 'Unpaid' })
  status: string;

  @Prop({ default: Date.now })
  generatedDate: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);