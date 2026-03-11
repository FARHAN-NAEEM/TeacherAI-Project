import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Exam, ExamDocument } from './schemas/exam.schema';
import { Result, ResultDocument } from './schemas/result.schema';

@Injectable()
export class ExamsService {
  constructor(
    @InjectModel(Exam.name) private examModel: Model<ExamDocument>,
    @InjectModel(Result.name) private resultModel: Model<ResultDocument>
  ) {}

  async create(teacherId: string, createExamDto: any) {
    const newExam = new this.examModel({
      ...createExamDto,
      teacherId: new Types.ObjectId(teacherId),
      batchId: new Types.ObjectId(createExamDto.batchId),
    });
    return await newExam.save();
  }

  async findAll(teacherId: string, batchId?: string) {
    const query: any = { teacherId: new Types.ObjectId(teacherId) };
    if (batchId) {
      query.batchId = new Types.ObjectId(batchId);
    }
    return await this.examModel.find(query).populate('batchId', 'name').sort({ date: -1 }).exec();
  }

  async remove(id: string, teacherId: string) {
    const deletedExam = await this.examModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      teacherId: new Types.ObjectId(teacherId),
    } as any);
    if (!deletedExam) throw new NotFoundException('Exam not found');
    return { message: 'Exam deleted successfully' };
  }

  // 🚀 ম্যাজিক ১: নির্দিষ্ট এক্সামের ডাটা ফেচ করা
  async getExamById(examId: string, teacherId: string) {
    return await this.examModel.findOne({
      _id: new Types.ObjectId(examId),
      teacherId: new Types.ObjectId(teacherId)
    } as any).populate('batchId', 'name').exec();
  }

  // 🚀 ম্যাজিক ২: পরীক্ষার কাস্টম কলামের নাম আপডেট করা
  async updateExamColumns(examId: string, teacherId: string, col1Name: string, col2Name: string) {
    return await this.examModel.findOneAndUpdate(
      { _id: new Types.ObjectId(examId), teacherId: new Types.ObjectId(teacherId) } as any,
      { $set: { col1Name, col2Name } },
      { returnDocument: 'after' } 
    );
  }

  // 🚀 ম্যাজিক ৩: একসাথে সব রেজাল্ট সেভ করা (Bulk Upsert)
  async saveResults(teacherId: string, examId: string, batchId: string, resultsData: any[]): Promise<any> {
    const operations = resultsData.map(record => ({
      updateOne: {
        filter: { 
          examId: new Types.ObjectId(examId), 
          studentId: new Types.ObjectId(record.studentId) 
        },
        update: { 
          $set: { 
            teacherId: new Types.ObjectId(teacherId),
            batchId: new Types.ObjectId(batchId),
            col1Marks: record.col1Marks, 
            col2Marks: record.col2Marks,
            isPresent: record.isPresent
          } 
        },
        upsert: true 
      }
    }));

    if (operations.length > 0) {
      return await this.resultModel.bulkWrite(operations as any);
    }
    return { message: 'No results to save' };
  }

  // 🚀 ম্যাজিক ৪: রেজাল্ট ফেচ করা
  async getResults(examId: string, teacherId: string) {
    return await this.resultModel.find({ 
      examId: new Types.ObjectId(examId),
      teacherId: new Types.ObjectId(teacherId)
    } as any).exec();
  }

  // 🚀 ম্যাজিক ৫: কম্বাইন্ড মেরিট লিস্ট জেনারেট করা (নতুন ফিচার)
  async getCombinedMerit(teacherId: string, batchIds: string[], examTitle: string) {
    const tId = new Types.ObjectId(teacherId);
    const bIds = batchIds.map(id => new Types.ObjectId(id));

    // ১. সিলেক্টেড ব্যাচগুলোর মধ্যে ওই নির্দিষ্ট নামের এক্সাম আইডিগুলো খুঁজে বের করা
    const targetExams = await this.examModel.find({
      teacherId: tId,
      batchId: { $in: bIds },
      title: examTitle
    } as any).select('_id').exec();

    const examIds = targetExams.map(e => e._id);
    if (examIds.length === 0) return [];

    // ২. ওই এক্সামগুলোর রেজাল্ট ফেচ করা (পপুলেশন সহ)
    // 🚀 এখানে 'as any' ব্যবহার করে টাইপ এরর ফিক্স করা হয়েছে
    const results = await this.resultModel.find({
      examId: { $in: examIds },
      teacherId: tId,
      $or: [{ isPresent: true }, { isPresent: 'true' }] 
    } as any)
    .populate('studentId', 'name studentId')
    .populate('batchId', 'name')
    .populate('examId', 'totalMarks title')
    .exec();

    // ৩. ডেটা ফরম্যাটিং এবং টোটাল মার্কস ক্যালকুলেশন
    const meritList = results.map(r => {
      const myTotal = (Number(r.col1Marks) || 0) + (Number(r.col2Marks) || 0);
      const examInfo = r.examId as any;
      
      return {
        name: (r.studentId as any)?.name || 'Unknown',
        studentId: (r.studentId as any)?.studentId || 'N/A',
        batch: (r.batchId as any)?.name || 'N/A',
        marks: myTotal,
        totalMarks: examInfo?.totalMarks || 100,
        percentage: examInfo?.totalMarks > 0 ? ((myTotal / examInfo.totalMarks) * 100).toFixed(1) : '0'
      };
    });

    // ৪. মার্কস অনুযায়ী বড় থেকে ছোট ক্রমানুসারে সর্টিং (Marks DESC)
    meritList.sort((a, b) => b.marks - a.marks);

    // ৫. র‍্যাঙ্কিং জেনারেট করা (একই মার্কস পেলে একই র‍্যাঙ্ক)
    let currentRank = 0;
    let lastMarks = -1;
    
    return meritList.map((item, index) => {
      if (item.marks !== lastMarks) {
        currentRank = index + 1;
      }
      lastMarks = item.marks;
      return { ...item, rank: currentRank };
    });
  }
}