import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static'; // 🚀 স্ট্যাটিক ফাইল সার্ভ করার জন্য ইমপোর্ট
import { join } from 'path'; // 🚀 ফাইলের পাথ সেট করার জন্য ইমপোর্ট

import { AuthModule } from './modules/auth/auth.module';
import { BatchesModule } from './modules/batches/batches.module';
import { StudentsModule } from './modules/students/students.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExamsModule } from './modules/exams/schemas/exams.module'; 
import { ExpensesModule } from './modules/expenses/expenses.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // এটি .env ফাইলটি লোড করে
    // .env এর MONGO_URI ব্যবহার করা হচ্ছে
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teacherai'),
    
    // -----------------------------------------------------
    // 🚀 NEW: স্ট্যাটিক ফাইল (লোগো, সিগনেচার) পাবলিক করার কনফিগারেশন
    // -----------------------------------------------------
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'), // 'uploads' ফোল্ডারটিকে টার্গেট করা হলো
      serveRoot: '/uploads', // ব্রাউজারে /uploads/... লিংকে ফাইলগুলো পাওয়া যাবে
    }),

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