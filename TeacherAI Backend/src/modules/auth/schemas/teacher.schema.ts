import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeacherDocument = Teacher & Document;

@Schema({ timestamps: true })
export class Teacher extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ unique: true, required: true, index: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phone: string;

  @Prop({ default: 'teacher' })
  role: string;

  // ইনস্টিটিউট নাম স্টোর করার জন্য
  @Prop({ default: 'TeacherAI Institute' })
  instituteName: string;

  // সিগনেচার ইমেজ পাথ বা স্ট্রিং স্টোর করার জন্য
  @Prop({ default: '' })
  signature: string;

  // 🚀 নতুন: প্রোফাইল পিকচার স্টোর করার জন্য
  @Prop({ default: '' })
  profilePicture: string;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);