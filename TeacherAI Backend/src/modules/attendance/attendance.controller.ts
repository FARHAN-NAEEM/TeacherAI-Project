import { Controller, Get, Post, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // হাজিরা গ্রহণ করা (Save/Update)
  @Post('take')
  async takeAttendance(@Body() attendanceData: any[], @Request() req): Promise<any> {
    return await this.attendanceService.takeAttendance(req.user.userId, attendanceData);
  }

  // নির্দিষ্ট দিন ও ব্যাচের হাজিরা চেক করা
  @Get('check')
  async getAttendance(
    @Query('batchId') batchId: string, 
    @Query('date') date: string, 
    @Request() req
  ): Promise<any> {
    return await this.attendanceService.getAttendanceByDate(req.user.userId, batchId, date);
  }

  @Get('report')
  async getMonthlyReport(
    @Query('batchId') batchId: string,
    @Query('month') month: string,
    @Request() req
  ): Promise<any> {
    const teacherId = req.user?.userId || req.user?.id;
    return await this.attendanceService.getMonthlyReport(teacherId, batchId, month);
  }

  // 🚀 নতুন: স্টুডেন্টের মান্থলি অ্যাটেনডেন্স সামারি (প্রোফাইল পেজের জন্য)
  @Get('student/:id/monthly')
  async getStudentMonthlyAttendance(
    @Param('id') studentId: string,
    @Request() req
  ): Promise<any> {
    const teacherId = req.user?.userId || req.user?.id;
    return await this.attendanceService.getStudentMonthlySummary(studentId, teacherId);
  }
}