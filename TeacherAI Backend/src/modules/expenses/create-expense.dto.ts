import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  note?: string;

  // 🚀 এই নতুন ফিল্ডটি যোগ করুন (এটি Optional)
  @IsString()
  @IsOptional()
  receiptImage?: string; 
}