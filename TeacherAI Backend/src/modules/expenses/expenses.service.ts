import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from './expense.schema';

@Injectable()
export class ExpensesService {
  constructor(@InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>) {}

  async createExpense(teacherId: string, data: any): Promise<ExpenseDocument> {
    const newExpense = new this.expenseModel({
      ...data,
      teacherId: new Types.ObjectId(teacherId),
    });
    return await newExpense.save();
  }

  async getExpenses(teacherId: string, startDate?: string, endDate?: string): Promise<ExpenseDocument[]> {
    const filter: any = { teacherId: new Types.ObjectId(teacherId) };
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = startDate;
    }
    // 🚀 as any ব্যবহার করা হয়েছে TypeScript overload এরর এড়াতে
    return await this.expenseModel.find(filter as any).sort({ date: -1, createdAt: -1 }).exec();
  }
}