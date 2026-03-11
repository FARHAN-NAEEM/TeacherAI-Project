// src/modules/batches/schemas/batch.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BatchDocument = Batch & Document;

@Schema({ timestamps: true })
export class Batch {
  @Prop({ required: true })
  name: string;

  // 🚀 নতুন ফিল্ড: স্টুডেন্ট আইডি জেনারেট করার জন্য ব্যাচ কোড (যেমন: B1, B2)
  @Prop({ required: false })
  batchCode: string;

  @Prop({ required: true })
  fee: number;

  @Prop({ required: true })
  schedule: string; // এখানে সপ্তাহের দিনগুলো থাকবে (e.g. Sat-Mon-Wed)

  // ব্যাচের সময় সংরক্ষণের জন্য
  @Prop({ required: true })
  time: string; 

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'Teacher', 
    required: true 
  })
  teacherId: MongooseSchema.Types.ObjectId;
}

export const BatchSchema = SchemaFactory.createForClass(Batch);