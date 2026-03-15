import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sms')
@UseGuards(JwtAuthGuard)
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  async sendSms(@Body() payload: any, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.smsService.sendBatchSms(teacherId, payload);
  }

  @Get('history')
  async getHistory(@Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.smsService.getSmsHistory(teacherId);
  }

  @Post('templates')
  async createTemplate(@Body() body: { title: string; content: string }, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.smsService.createTemplate(teacherId, body.title, body.content);
  }

  @Get('templates')
  async getTemplates(@Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.smsService.getTemplates(teacherId);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.smsService.deleteTemplate(id, teacherId);
  }

  // ------------------------------------------------------------------
  // 🚀 NEW FEATURE: Gateway Settings API Endpoints
  // ------------------------------------------------------------------
  @Get('settings')
  async getSettings(@Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.smsService.getGatewaySettings(teacherId);
  }

  @Patch('settings')
  async updateSettings(@Body() body: any, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.smsService.updateGatewaySettings(teacherId, body);
  }
}