import { 
  Controller, Post, Get, Body, Query, Req, UseGuards, 
  UseInterceptors, UploadedFile 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('expenses') // 🚀 Route: /api/v1/expenses
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('receiptImage', {
    storage: diskStorage({
      destination: './uploads/receipts',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `receipt-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async addExpense(
    @Req() req, 
    @Body() body: any, 
    @UploadedFile() file: Express.Multer.File
  ) {
    const teacherId = req.user.userId || req.user._id;
    const expenseData = {
      ...body,
      amount: Number(body.amount),
      // 🚀 ডাটাবেসে সেভ করার জন্য পাথ জেনারেট
      receiptImage: file ? `/uploads/receipts/${file.filename}` : '', 
    };
    return await this.expensesService.createExpense(teacherId, expenseData);
  }

  @Get()
  async getAllExpenses(
    @Req() req, 
    @Query('startDate') start?: string, 
    @Query('endDate') end?: string
  ) {
    const teacherId = req.user.userId || req.user._id;
    return await this.expensesService.getExpenses(teacherId, start, end);
  }
}