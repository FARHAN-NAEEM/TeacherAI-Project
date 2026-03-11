import { IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsMongoId()
  @IsNotEmpty()
  student: string;

  @IsMongoId()
  @IsNotEmpty()
  batch: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(['Paid', 'Pending'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  paymentDate?: string;
}