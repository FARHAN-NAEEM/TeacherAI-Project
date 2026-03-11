import { Controller, Get, Post, Body, UseGuards, Request, Query, Param, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // স্মার্ট পেমেন্ট গ্রহণ করা (Full, Partial, Discount)
  @Post('collect')
  async collectPayment(@Body() data: any, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    if (!teacherId) {
      throw new BadRequestException('Teacher authentication failed!');
    }
    return this.paymentsService.collectPayment(data, teacherId);
  }

  // 🚀 নতুন: ইনভয়েস জেনারেট করার এপিআই
  @Post('generate-invoice')
  async generateInvoice(@Body() data: { studentId: string, batchId: string, billingMonth: string }, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    if (!teacherId) throw new BadRequestException('Unauthorized request');
    
    return this.paymentsService.generateInvoice(data, teacherId);
  }

  // নির্দিষ্ট মাসের পেমেন্ট লিস্ট দেখা
  @Get('monthly')
  async getMonthlyPayments(
    @Query('batchId') batchId: string,
    @Query('month') month: string,
    @Request() req,
  ) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.paymentsService.getMonthlyPayments(batchId, month, teacherId);
  }

  // 🚀 নির্দিষ্ট স্টুডেন্টের পেমেন্ট হিস্টোরি দেখা (টাইমলাইনের জন্য)
  @Get('student/:id')
  async findByStudent(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    const records = await this.paymentsService.findByStudent(id, teacherId);
    return { success: true, data: records };
  }

  // ফাইন্যান্স ড্যাশবোর্ডের জন্য সব পেমেন্ট (ইনকাম) একসাথে আনা
  @Get()
  async getAllPayments(@Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    const records = await this.paymentsService.getAllPayments(teacherId);
    return { success: true, data: records };
  }
}