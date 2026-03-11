import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

// ড্যাশবোর্ড এবং অন্যান্য সার্ভিসের জন্য টাইপ এক্সপোর্ট
export type StudentDocument = Student & Document;

@Schema({ timestamps: true })
export class Student {
  @Prop({ required: true })
  name: string;

  // Auto Generated ID এর জন্য
  @Prop({ required: true })
  studentId: string; 

  @Prop({ required: true })
  phone: string; 

  @Prop({ required: true })
  parentPhone: string; 

  // শুরুতে ব্যাচ ছাড়াই স্টুডেন্ট অ্যাড করার জন্য অপশনাল
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Batch', required: false })
  batchId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: () => new Date().toISOString().slice(0, 10) })
  admissionDate: string;

  @Prop({ required: true, enum: ['Active', 'Deactive'], default: 'Active' })
  status: string;

  // 🚀 নতুন: স্টুডেন্ট প্রোফাইলের ছবির জন্য ফিল্ড যুক্ত করা হলো
  @Prop({ required: false, default: '' })
  photo: string;
}

export const StudentSchema = SchemaFactory.createForClass(Student);