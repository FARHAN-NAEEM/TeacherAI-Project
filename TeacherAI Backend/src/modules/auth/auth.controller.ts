import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Put, 
  UseGuards, 
  Request, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException 
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

// -----------------------------------------------------
// 🚀 MULTER CONFIGURATION FOR BRANDING FILES
// -----------------------------------------------------
const brandingStorage = diskStorage({
  destination: './uploads', // রুট ডিরেক্টরির uploads ফোল্ডারে সেভ হবে
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`); // Example: logo-1678901234.png
  },
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    // req.user.userId আসবে JwtStrategy থেকে
    return this.authService.getProfile(req.user.userId);
  }

  // 🚀 UPDATE: Added 'profile' alias to match REST standard and frontend requirements
  @Put(['update-profile', 'profile'])
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() updateData: any) {
    const userId = req.user.userId;
    return this.authService.updateProfile(userId, updateData);
  }

  // -----------------------------------------------------
  // 🚀 NEW: INSTITUTION BRANDING FILE UPLOADS
  // -----------------------------------------------------

  @Post('upload-logo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo', { storage: brandingStorage }))
  async uploadLogo(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No logo file uploaded');
    }
    // ফাইলের পাথ তৈরি করে সরাসরি প্রোফাইলে আপডেট করে দেওয়া হচ্ছে
    const fileUrl = `/uploads/${file.filename}`;
    return this.authService.updateProfile(req.user.userId, { logo: fileUrl });
  }

  @Post('upload-signature')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('signature', { storage: brandingStorage }))
  async uploadSignature(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No signature file uploaded');
    }
    // ফাইলের পাথ তৈরি করে সরাসরি প্রোফাইলে আপডেট করে দেওয়া হচ্ছে
    const fileUrl = `/uploads/${file.filename}`;
    return this.authService.updateProfile(req.user.userId, { signature: fileUrl });
  }
}