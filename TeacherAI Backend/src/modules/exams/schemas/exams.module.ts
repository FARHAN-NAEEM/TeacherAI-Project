import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamsController } from '../exams.controller';
import { ExamsService } from '../exams.service';
import { Exam, ExamSchema } from './exam.schema';
import { Result, ResultSchema } from './result.schema'; // 🚀 নতুন রেজাল্ট স্কিমা ইমপোর্ট করা হলো

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
      { name: Result.name, schema: ResultSchema } // 🚀 মডিউলে রেজাল্ট যোগ করা হলো
    ])
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}