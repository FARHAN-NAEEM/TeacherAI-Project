import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { Sms, SmsSchema } from './schemas/sms.schema';
import { SmsTemplate, SmsTemplateSchema } from './schemas/sms-template.schema'; // 🚀 NEW
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { Batch, BatchSchema } from '../batches/schemas/batch.schema';
import { Teacher, TeacherSchema } from '../auth/schemas/teacher.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sms.name, schema: SmsSchema },
      { name: SmsTemplate.name, schema: SmsTemplateSchema }, // 🚀 NEW
      { name: Student.name, schema: StudentSchema },
      { name: Batch.name, schema: BatchSchema },
      { name: Teacher.name, schema: TeacherSchema },
    ]),
  ],
  controllers: [SmsController],
  providers: [SmsService],
})
export class SmsModule {}