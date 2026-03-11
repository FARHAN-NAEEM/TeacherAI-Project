import { IsNotEmpty, IsOptional, IsString, IsMongoId } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty({ message: 'স্টুডেন্টের নাম অবশ্যই দিতে হবে' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'রোল নম্বর প্রয়োজন' })
  roll: string;

  @IsString()
  @IsNotEmpty({ message: 'ফোন নম্বর অবশ্যই দিতে হবে' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'অভিভাবকের ফোন নম্বর প্রয়োজন' })
  parentPhone: string;

  // 🚀 আপডেট: এখন এটি অপশনাল (@IsOptional), যাতে ব্যাচ ছাড়াও স্টুডেন্ট অ্যাড করা যায়
  @IsMongoId({ message: 'সঠিক ব্যাচ আইডি প্রদান করুন' })
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  admissionDate?: string;

  @IsString()
  @IsOptional()
  status?: string;
}