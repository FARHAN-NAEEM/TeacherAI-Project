import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudentStatusHistoryDocument = StudentStatusHistory & Document;

@Schema({ timestamps: true })
export class StudentStatusHistory {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  studentId: Types.ObjectId;

  @Prop({ required: true })
  status: string; // "Active" বা "Deactive"

  @Prop({ default: Date.now })
  changedDate: Date;

  @Prop()
  note: string; // যেমন: "Fees not paid", "Left the course"
}

export const StudentStatusHistorySchema = SchemaFactory.createForClass(StudentStatusHistory);