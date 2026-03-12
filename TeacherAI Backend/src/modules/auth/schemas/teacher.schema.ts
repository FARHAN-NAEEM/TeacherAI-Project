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

  // -----------------------------------------------------
  // 🏫 EXISTING FIELDS (কোনো পরিবর্তন করা হয়নি)
  // -----------------------------------------------------
  @Prop({ default: 'TeacherAI Institute' })
  instituteName: string;

  @Prop({ default: '' })
  signature: string;

  @Prop({ default: '' })
  profilePicture: string;

  // -----------------------------------------------------
  // 🚀 NEW: INSTITUTION BRANDING FIELDS (নতুন অ্যাড করা হলো)
  // -----------------------------------------------------
  
  // প্রতিষ্ঠানের ছোট নাম (যেমন: FA)
  @Prop({ default: '' })
  shortName: string;

  // প্রতিষ্ঠান কবে তৈরি হয়েছে
  @Prop({ default: '' })
  establishedYear: string;

  // প্রতিষ্ঠানের ঠিকানা
  @Prop({ default: '' })
  address: string;

  // যোগাযোগের ইমেইল (লগইন ইমেইল থেকে আলাদা হতে পারে)
  @Prop({ default: '' })
  institutionEmail: string;

  // ওয়েবসাইট URL
  @Prop({ default: '' })
  website: string;

  // লোগো স্টোর করার জন্য (Base64 বা Image URL)
  @Prop({ default: '' })
  logo: string;

  // সিগনেচার বাই-ডিফল্ট সার্টিফিকেটে ব্যবহার হবে কিনা
  @Prop({ default: true })
  useSignatureAsDefault: boolean;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);