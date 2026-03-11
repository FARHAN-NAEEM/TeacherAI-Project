import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty({ message: 'Batch name cannot be empty' })
  name: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Monthly fee is required' })
  fee: number;

  @IsString()
  @IsNotEmpty({ message: 'Schedule (Days) is required' })
  schedule: string;

  // 🚀 নতুন ফিল্ড: ব্যাচের সময় ভ্যালিডেশন
  @IsString()
  @IsNotEmpty({ message: 'Batch time is required' })
  time: string;
}