import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';

// 🚀 স্টুডেন্ট স্কিমা
import { Student, StudentSchema } from '../students/schemas/student.schema';

// 🚀 নতুন স্কিমাগুলো ইমপোর্ট করা হলো
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { StudentStatusHistory, StudentStatusHistorySchema } from './schemas/student-status-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Student.name, schema: StudentSchema },
      // 🚀 ইনভয়েস এবং স্ট্যাটাস হিস্ট্রি স্কিমা রেজিস্টার করা হলো
      { name: Invoice.name, schema: InvoiceSchema },
      { name: StudentStatusHistory.name, schema: StudentStatusHistorySchema }
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}