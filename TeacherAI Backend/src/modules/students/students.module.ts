import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { Student, StudentSchema } from './schemas/student.schema';
import { Batch, BatchSchema } from '../batches/schemas/batch.schema';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Exam, ExamSchema } from '../exams/schemas/exam.schema';
import { Result, ResultSchema } from '../exams/schemas/result.schema';
// 🚀 নতুন ইম্পোর্ট: টিচার স্কিমা যুক্ত করা হলো (যাতে ডায়নামিক ব্র্যান্ডিং কাজ করে)
import { Teacher, TeacherSchema } from '../auth/schemas/teacher.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Batch.name, schema: BatchSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Exam.name, schema: ExamSchema },
      { name: Result.name, schema: ResultSchema },
      // 🚀 ফিক্সড: টিচার মডেল রেজিস্টার করা হলো যা আগে মিসিং ছিল
      { name: Teacher.name, schema: TeacherSchema }, 
    ]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}