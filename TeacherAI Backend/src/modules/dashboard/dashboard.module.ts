import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Batch, BatchSchema } from '../batches/schemas/batch.schema';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';

// 🚀 নতুন ইমপোর্ট: এক্সপেন্স মডেলটি যুক্ত করা হলো
import { Expense, ExpenseSchema } from '../expenses/expense.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Batch.name, schema: BatchSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Payment.name, schema: PaymentSchema },
      // 🚀 ফিক্স: ড্যাশবোর্ড সার্ভিসের জন্য এক্সপেন্স মডেলটি এখানে রেজিস্টার করা হলো
      { name: Expense.name, schema: ExpenseSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}