import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SmsTemplateDocument = SmsTemplate & Document;

@Schema({ timestamps: true })
export class SmsTemplate {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  title: string; // টেমপ্লেটের নাম (যেমন: Payment Reminder)

  @Prop({ required: true })
  content: string; // মূল মেসেজটি
}

export const SmsTemplateSchema = SchemaFactory.createForClass(SmsTemplate);