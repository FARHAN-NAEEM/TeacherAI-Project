import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class MarkAttendanceDto {
  @IsMongoId()
  @IsNotEmpty()
  batch: string;

  @IsMongoId()
  @IsNotEmpty()
  student: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsEnum(['Present', 'Absent'])
  status: string;
}