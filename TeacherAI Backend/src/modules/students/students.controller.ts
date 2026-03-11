import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express'; // 🚀 FIX: 'import type' ব্যবহার করা হয়েছে

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // 🚀 স্টুডেন্ট ফটো আপলোড এন্ডপয়েন্ট
  @Patch(':id/upload-photo')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        return cb(null, `KB-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
        return cb(new BadRequestException('শুধুমাত্র ছবি (JPG, PNG, WebP) আপলোড করা যাবে!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 } // ২ মেগাবাইট লিমিট
  }))
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) throw new BadRequestException('কোনো ফাইল সিলেক্ট করা হয়নি!');
    
    // ✅ ডাইনামিক ইউআরএল তৈরি (এটি লোকাল বা সার্ভার সব জায়গায় কাজ করবে)
    const protocol = req.protocol;
    const host = req.get('host');
    const photoUrl = `${protocol}://${host}/uploads/${file.filename}`;
    
    return this.studentsService.updatePhoto(id, photoUrl);
  }

  @Post()
  create(@Body() createDto: any, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.studentsService.create(createDto, teacherId);
  }

  @Get('generate-id')
  async generateId(@Query('batchId') batchId: string, @Query('year') year: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    const generatedId = await this.studentsService.generateStudentId(batchId, year, teacherId);
    return { generatedId }; 
  }

  @Get('unassigned')
  findUnassigned(@Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.studentsService.findUnassigned(teacherId);
  }

  @Post('assign-batch')
  assignToBatch(@Body() body: { studentIds: string[], batchId: string }, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.studentsService.assignToBatch(body.studentIds, body.batchId, teacherId);
  }

  @Get()
  findAll(@Request() req, @Query('batchId') batchId: string, @Query('activeOnly') activeOnly: string) {
    const teacherId = req.user?.userId || req.user?.id;
    const isActiveOnly = activeOnly === 'true';
    return this.studentsService.findAll(teacherId, batchId, isActiveOnly);
  }

  @Get(':id/profile')
  async getProfile(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.studentsService.getStudentProfile(id, teacherId);
  }

  // 🚀 FIX (Issue 1): Backend PDF Download Endpoint
  @Get(':id/report')
  async downloadStudentReport(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const teacherId = req.user?.userId || req.user?.id;
    
    try {
      // সার্ভিস থেকে PDF Buffer তৈরি করে আনা হচ্ছে
      const pdfBuffer = await this.studentsService.generateStudentReportPdf(id, teacherId);
      
      // Response Headers সেট করা হচ্ছে যাতে ব্রাউজার সরাসরি ডাউনলোড করে
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="student-report-${id}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });

      // Buffer সেন্ড করা হচ্ছে
      res.end(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate PDF report', error: error.message });
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.studentsService.findOne(id, teacherId);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.studentsService.toggleStatus(id, teacherId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.studentsService.update(id, updateDto, teacherId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.studentsService.remove(id, teacherId);
  }
}