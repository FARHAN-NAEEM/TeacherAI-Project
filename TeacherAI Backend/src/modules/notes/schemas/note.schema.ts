import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Note extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  fileUrl: string; // আপলোড করা ফাইলের পাথ বা URL

  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batch: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true, index: true })
  createdBy: Types.ObjectId;
}

export const NoteSchema = SchemaFactory.createForClass(Note);