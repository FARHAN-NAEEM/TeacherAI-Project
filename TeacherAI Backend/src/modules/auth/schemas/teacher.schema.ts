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
  // 🏫 EXISTING FIELDS (কোনো পরিবর্তন করা হয়নি)
  // -----------------------------------------------------
  @Prop({ default: 'TeacherAI Institute' })
  instituteName: string;

  @Prop({ default: '' })
  signature: string;

  @Prop({ default: '' })
  profilePicture: string;

  // -----------------------------------------------------
  // 🚀 INSTITUTION BRANDING FIELDS
  // -----------------------------------------------------
  @Prop({ default: '' })
  shortName: string;

  @Prop({ default: '' })
  establishedYear: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  institutionEmail: string;

  @Prop({ default: '' })
  website: string;

  @Prop({ default: '' })
  logo: string;

  @Prop({ default: true })
  useSignatureAsDefault: boolean;

  // -----------------------------------------------------
  // 🚀 NEW: SMS GATEWAY SETTINGS (API Credentials)
  // -----------------------------------------------------
  @Prop({ default: 'none' }) // Options: 'sslwireless', 'bulksms', 'none'
  smsProvider: string;

  @Prop({ default: '' })
  smsApiKey: string;

  @Prop({ default: '' })
  smsSenderId: string;

  @Prop({ default: '' })
  smsClientId: string; // Required for some APIs like SSL Wireless
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);