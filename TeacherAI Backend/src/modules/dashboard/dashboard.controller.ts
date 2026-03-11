import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getStats(@Request() req, @Query('date') filterDate: string) {
    // টোকেন থেকে টিচার আইডি নেওয়া
    const teacherId = req.user?.userId || req.user?.id;
    
    // filterDate (যদি থাকে) সহ সার্ভিসের কাছে পাঠানো
    const stats = await this.dashboardService.getStats(teacherId, filterDate);
    
    return { data: stats }; 
  }
}