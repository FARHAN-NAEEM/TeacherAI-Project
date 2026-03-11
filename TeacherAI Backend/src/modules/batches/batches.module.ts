import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';
import { Batch, BatchSchema } from './schemas/batch.schema';

// 🚀 নতুন ইমপোর্ট: Student এবং Payment স্কিমা
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Batch.name, schema: BatchSchema },
      // 🚀 ফিক্স: সার্ভিস ডিপেন্ডেন্সি এরর এড়াতে এগুলো যুক্ত করা হলো
      { name: Student.name, schema: StudentSchema },
      { name: Payment.name, schema: PaymentSchema }
    ]),
  ],
  controllers: [BatchesController],
  providers: [BatchesService],
})
export class BatchesModule {}