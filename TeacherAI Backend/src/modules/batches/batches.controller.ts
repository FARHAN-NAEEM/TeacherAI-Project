import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('batches')
@UseGuards(JwtAuthGuard)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  async create(@Body() createBatchDto: CreateBatchDto, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.batchesService.create(createBatchDto, teacherId);
  }

  @Get()
  async findAll(@Request() req, @Query('search') search: string) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.batchesService.findAll(teacherId, search);
  }

  // 🚀 নতুন: নির্দিষ্ট ব্যাচের স্টুডেন্ট এবং তাদের পেমেন্ট স্ট্যাটাস দেখার এন্ডপয়েন্ট
  @Get(':id/students-with-payment')
  async getBatchStudents(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.batchesService.getBatchStudentsWithPayment(id, teacherId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.batchesService.findOne(id, teacherId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateDto: Partial<CreateBatchDto>, 
    @Request() req
  ) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.batchesService.update(id, updateDto, teacherId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.batchesService.remove(id, teacherId);
  }
}