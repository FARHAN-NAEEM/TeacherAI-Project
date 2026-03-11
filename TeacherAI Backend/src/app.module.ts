import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { BatchesModule } from './modules/batches/batches.module';
import { StudentsModule } from './modules/students/students.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExamsModule } from './modules/exams/schemas/exams.module'; 
import { ExpensesModule } from './modules/expenses/expenses.module'; // 🚀 নতুন Expense মডিউল ইমপোর্ট করা হলো

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // এটি .env ফাইলটি লোড করে
    // .env এর MONGO_URI ব্যবহার করা হচ্ছে
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teacherai'),
    AuthModule,
    BatchesModule,
    StudentsModule,
    AttendanceModule,
    PaymentsModule,
    DashboardModule,
    ExamsModule, 
    ExpensesModule, // 🚀 মডিউল লিস্টে যোগ করা হলো
  ],
})
export class AppModule {}