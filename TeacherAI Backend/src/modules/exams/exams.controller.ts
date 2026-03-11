import { Controller, Get, Post, Put, Body, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  create(@Body() createExamDto: any, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.examsService.create(teacherId, createExamDto);
  }

  @Get()
  findAll(@Query('batchId') batchId: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.examsService.findAll(teacherId, batchId);
  }

  // 🚀 নতুন: নির্দিষ্ট একটি পরীক্ষার ডাটা পাওয়ার রাউট
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.examsService.getExamById(id, teacherId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.examsService.remove(id, teacherId);
  }

  // 🚀 নতুন: কলামের নাম (MCQ/Written) আপডেট করার রাউট
  @Put(':id/columns')
  updateColumns(@Param('id') id: string, @Body() body: { col1Name: string, col2Name: string }, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.examsService.updateExamColumns(id, teacherId, body.col1Name, body.col2Name);
  }

  // 🚀 নতুন: একসাথে সব রেজাল্ট সেভ করার রাউট
  @Post(':id/results')
  saveResults(@Param('id') examId: string, @Body() body: { batchId: string, results: any[] }, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.examsService.saveResults(teacherId, examId, body.batchId, body.results);
  }

  // 🚀 নতুন: সেভ করা রেজাল্টগুলো পাওয়ার রাউট
  @Get(':id/results')
  getResults(@Param('id') examId: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.examsService.getResults(examId, teacherId);
  }

  // 🚀 ম্যাজিক ৬: কম্বাইন্ড মেরিট লিস্ট জেনারেট করার এন্ডপয়েন্ট (নতুন ফিচার)
  @Post('combined-merit')
  async getCombinedMerit(
    @Request() req,
    @Body() body: { batchIds: string[], examTitle: string }
  ) {
    const teacherId = req.user?.userId || req.user?.id;
    // 🚀 সার্ভিস মেথড কল করা হচ্ছে ব্যাচ আইডি লিস্ট এবং এক্সাম টাইটেল দিয়ে
    return await this.examsService.getCombinedMerit(teacherId, body.batchIds, body.examTitle);
  }
}