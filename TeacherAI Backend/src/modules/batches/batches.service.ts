import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Batch, BatchDocument } from './schemas/batch.schema';
import { CreateBatchDto } from './dto/create-batch.dto';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';

@Injectable()
export class BatchesService {
  constructor(
    @InjectModel(Batch.name) private batchModel: Model<BatchDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>
  ) {}

  private async checkScheduleConflict(teacherId: string, schedule: string, time: string, excludeBatchId?: string) {
    const query: any = { teacherId: teacherId as any, time };
    if (excludeBatchId) {
      query._id = { $ne: excludeBatchId as any }; 
    }
    
    const existingBatches = await this.batchModel.find(query).exec();
    const newDays = schedule.toUpperCase().split(/[- ,]+/).map(d => d.trim());

    for (const batch of existingBatches) {
      const existingDays = batch.schedule.toUpperCase().split(/[- ,]+/).map(d => d.trim());
      const hasOverlap = newDays.some(day => existingDays.includes(day));

      if (hasOverlap) {
        const overlapDays = newDays.filter(day => existingDays.includes(day));
        throw new ConflictException(`এই সময়ের (${time}) "${overlapDays.join(', ')}" দিনগুলোতে ইতিমধ্যে একটি ব্যাচ রয়েছে!`);
      }
    }
  }

  async create(createBatchDto: CreateBatchDto, teacherId: string) {
    if (!teacherId) throw new UnauthorizedException('Teacher ID missing from token!');

    const { name, schedule, time } = createBatchDto as any;

    const existingBatch = await this.batchModel.findOne({ name, teacherId: teacherId as any }).exec();
    if (existingBatch) throw new ConflictException(`Batch with name "${name}" already exists!`);

    if (schedule && time) {
      await this.checkScheduleConflict(teacherId, schedule, time);
    }

    // 🚀 ম্যাজিক: BatchCode জেনারেট করা হচ্ছে
    let batchCode = (createBatchDto as any).batchCode;
    if (!batchCode && name) {
      const words = name.trim().split(/\s+/);
      if (words.length >= 2) {
        batchCode = (words[0][0] + words[1][0]).toUpperCase();
      } else {
        batchCode = name.substring(0, 2).toUpperCase();
      }
    }

    const newBatch = new this.batchModel({
      ...createBatchDto,
      batchCode, // ডাটাবেসে সেভ হবে
      teacherId: new Types.ObjectId(teacherId),
    });

    return await newBatch.save();
  }

  async findAll(teacherId: string, search: string) {
    const query: any = { teacherId: teacherId as any };
    if (search) query.name = { $regex: search, $options: 'i' };
    return await this.batchModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, teacherId: string) {
    const batch = await this.batchModel.findOne({ _id: id as any, teacherId: teacherId as any }).exec();
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async update(id: string, updateDto: Partial<CreateBatchDto>, teacherId: string) {
    const { name, schedule, time } = updateDto as any;

    if (name) {
      const existing = await this.batchModel.findOne({ 
        name: name, teacherId: teacherId as any, _id: { $ne: id as any } 
      }).exec();
      if (existing) throw new ConflictException('Another batch already has this name');
    }

    if (schedule && time) {
       await this.checkScheduleConflict(teacherId, schedule, time, id);
    }

    const updatedBatch = await this.batchModel.findOneAndUpdate(
      { _id: id as any, teacherId: teacherId as any },
      { $set: updateDto },
      { returnDocument: 'after' }
    ).exec();

    if (!updatedBatch) throw new NotFoundException('Batch not found');
    return updatedBatch;
  }

  async remove(id: string, teacherId: string) {
    const result = await this.batchModel.findOneAndDelete({ _id: id as any, teacherId: teacherId as any }).exec();
    if (!result) throw new NotFoundException('Batch not found');
    return { message: 'Batch deleted successfully' };
  }

  async getBatchStudentsWithPayment(batchId: string, teacherId: string) {
    const students = await this.studentModel.find({ 
      batchId: batchId as any, 
      teacherId: teacherId as any 
    }).populate('batchId', 'name').sort({ studentId: 1 }).exec();

    const dateObj = new Date();
    dateObj.setHours(dateObj.getHours() + 6); 
    const currentMonth = dateObj.toISOString().slice(0, 7);

    const studentsWithPayment = await Promise.all(students.map(async (student) => {
      const payment = await this.paymentModel.findOne({
        studentId: student._id as any,
        batchId: batchId as any,
        month: currentMonth
      }).exec();

      return {
        _id: student._id,
        studentId: student.studentId || (student as any).roll || 'N/A', 
        name: student.name,
        phone: student.phone,
        admissionDate: student.admissionDate,
        status: student.status,
        batchName: (student.batchId as any)?.name || 'Unknown',
        paymentStatus: payment ? payment.status : 'Unpaid' 
      };
    }));

    return studentsWithPayment;
  }
}