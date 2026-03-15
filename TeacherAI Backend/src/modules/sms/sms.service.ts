import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sms, SmsDocument } from './schemas/sms.schema';
import { SmsTemplate, SmsTemplateDocument } from './schemas/sms-template.schema'; 
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Batch, BatchDocument } from '../batches/schemas/batch.schema';
import { Teacher, TeacherDocument } from '../auth/schemas/teacher.schema';
import axios from 'axios';

@Injectable()
export class SmsService {
  constructor(
    @InjectModel(Sms.name) private smsModel: Model<SmsDocument>,
    @InjectModel(SmsTemplate.name) private smsTemplateModel: Model<SmsTemplateDocument>, 
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Batch.name) private batchModel: Model<BatchDocument>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
  ) {}

  async sendBatchSms(teacherId: string, payload: any) {
    const { batchId, smsType, recipientType, message } = payload;

    const teacher = await this.teacherModel.findById(teacherId).exec();
    const batch = await this.batchModel.findById(batchId).exec();
    
    if (!teacher || !batch) throw new NotFoundException('Teacher or Batch not found');
    
    const students = await this.studentModel.find({ 
      batchId: new Types.ObjectId(batchId),
      status: 'Active' 
    } as any).exec();

    if (students.length === 0) {
      throw new BadRequestException('No active students found in this batch');
    }

    let successCount = 0;

    for (const student of students) {
      let personalizedMessage = message
        .replace(/{Name}/g, student.name)
        .replace(/{Batch}/g, batch.name);

      const phoneNumbers: string[] = [];
      
      if (recipientType === 'student' || recipientType === 'both') {
        if (student.phone) phoneNumbers.push(student.phone);
      }
      if (recipientType === 'guardian' || recipientType === 'both') {
        if (student.parentPhone) phoneNumbers.push(student.parentPhone);
      }

      const uniqueNumbers = [...new Set(phoneNumbers.filter(n => n && n.length >= 10))];

      if (uniqueNumbers.length > 0) {
        // SMS Gateway Logic will go here
        successCount += uniqueNumbers.length;
      }
    }

    const smsHistory = new this.smsModel({
      teacherId: new Types.ObjectId(teacherId),
      batchId: new Types.ObjectId(batchId),
      smsType,
      recipientType,
      messageTemplate: message,
      recipientCount: successCount,
      status: 'Sent'
    });

    await smsHistory.save();

    return { 
      success: true, 
      message: `SMS dispatched successfully to ${successCount} recipients.`,
      recipientCount: successCount 
    };
  }

  async getSmsHistory(teacherId: string) {
    return await this.smsModel.find({ teacherId: new Types.ObjectId(teacherId) } as any)
      .populate('batchId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ------------------------------------------------------------------
  // 🚀 SMS Templates Logic
  // ------------------------------------------------------------------
  async createTemplate(teacherId: string, title: string, content: string) {
    if (!title || !content) throw new BadRequestException('Title and content are required');
    
    const newTemplate = new this.smsTemplateModel({
      teacherId: new Types.ObjectId(teacherId),
      title,
      content
    });
    
    return await newTemplate.save();
  }

  async getTemplates(teacherId: string) {
    return await this.smsTemplateModel.find({ teacherId: new Types.ObjectId(teacherId) } as any).sort({ createdAt: -1 }).exec();
  }

  async deleteTemplate(id: string, teacherId: string) {
    const deleted = await this.smsTemplateModel.findOneAndDelete({ 
      _id: new Types.ObjectId(id), 
      teacherId: new Types.ObjectId(teacherId) 
    } as any).exec();
    
    if (!deleted) throw new NotFoundException('Template not found');
    return { success: true, message: 'Template deleted successfully' };
  }

  // ------------------------------------------------------------------
  // 🚀 NEW FEATURE: Gateway Settings Logic
  // ------------------------------------------------------------------
  async getGatewaySettings(teacherId: string) {
    const teacher = await this.teacherModel.findById(teacherId).select('smsProvider smsApiKey smsSenderId smsClientId').exec();
    if (!teacher) throw new NotFoundException('Profile not found');
    return teacher;
  }

  async updateGatewaySettings(teacherId: string, payload: any) {
    const updated = await this.teacherModel.findByIdAndUpdate(
      teacherId,
      { $set: payload },
      { new: true, select: 'smsProvider smsApiKey smsSenderId smsClientId' }
    ).exec();
    
    return { success: true, message: 'Gateway settings updated successfully', data: updated };
  }
}