import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static'; 
import { join } from 'path'; 

import { AuthModule } from './modules/auth/auth.module';
import { BatchesModule } from './modules/batches/batches.module';
import { StudentsModule } from './modules/students/students.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExamsModule } from './modules/exams/schemas/exams.module'; 
import { ExpensesModule } from './modules/expenses/expenses.module'; 
import { SmsModule } from './modules/sms/sms.module'; // 🚀 NEW: SMS Module ইমপোর্ট করা হলো

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teacherai'),
    
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'), 
      serveRoot: '/uploads', 
    }),

    AuthModule,
    BatchesModule,
    StudentsModule,
    AttendanceModule,
    PaymentsModule,
    DashboardModule,
    ExamsModule, 
    ExpensesModule, 
    SmsModule, // 🚀 NEW: মডিউল লিস্টে যোগ করা হলো
  ],
})
export class AppModule {}