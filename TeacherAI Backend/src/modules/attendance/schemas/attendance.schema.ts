import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Batch', required: true })
  batchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Student', required: true })
  studentId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  date: string; // ফরম্যাট: YYYY-MM-DD

  @Prop({ default: false })
  isPresent: boolean;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);