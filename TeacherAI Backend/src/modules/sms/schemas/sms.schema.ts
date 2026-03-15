import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SmsDocument = Sms & Document;

@Schema({ timestamps: true })
export class Sms {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Teacher', required: true })
  teacherId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Batch', required: true })
  batchId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  smsType: string; // 'custom', 'payment', 'result'

  @Prop({ required: true })
  recipientType: string; // 'student', 'guardian', 'both'

  @Prop({ required: true })
  messageTemplate: string;

  @Prop({ required: true, default: 0 })
  recipientCount: number;

  @Prop({ required: true, default: 'Sent' })
  status: string; // 'Sent', 'Failed', 'Processing'
}

export const SmsSchema = SchemaFactory.createForClass(Sms);