import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, HydratedDocument } from 'mongoose';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({ timestamps: true })
export class Expense {
  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true, default: 0 })
  amount: number;

  @Prop({ required: true })
  date: string;

  @Prop()
  note: string;

  @Prop()
  receiptImage: string; // 🚀 রিসিপ্ট ছবির পাথ
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);