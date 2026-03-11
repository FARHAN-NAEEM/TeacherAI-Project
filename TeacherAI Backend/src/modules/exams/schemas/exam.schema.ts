import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExamDocument = Exam & Document;

@Schema({ timestamps: true })
export class Exam extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batchId: Types.ObjectId;

  @Prop({ required: true })
  title: string; 

  @Prop({ required: true })
  examType: string; 

  @Prop({ required: true })
  totalMarks: number;

  @Prop({ required: true })
  date: Date;

  @Prop({ default: 'MCQ' })
  col1Name: string;

  @Prop({ default: 'Written' })
  col2Name: string;
}

export const ExamSchema = SchemaFactory.createForClass(Exam);