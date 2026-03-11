import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Teacher, TeacherDocument } from './schemas/teacher.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;
    const existingUser = await this.teacherModel.findOne({ email });
    if (existingUser) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.teacherModel.create({
      ...registerDto,
      password: hashedPassword,
    });

    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.teacherModel.findOne({ email: loginDto.email });
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user);
  }

  async getProfile(userId: string) {
    const user = await this.teacherModel.findById(userId).select('-password').exec();
    if (!user) throw new NotFoundException('Teacher not found');
    return user;
  }

  async updateProfile(userId: string, updateData: any) {
    const updatedUser = await this.teacherModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { returnDocument: 'after' }
    ).select('-password');

    if (!updatedUser) throw new NotFoundException('Teacher not found');
    return updatedUser;
  }

  private generateTokens(user: any) {
    // sub ব্যবহার করা হচ্ছে যাতে JwtStrategy সহজে আইডি পায়
    const payload = { sub: user._id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        instituteName: user.instituteName || '',
        signature: user.signature || '',
        profilePicture: user.profilePicture || '' // 🚀 ফিক্সড: লগইন রেসপন্সে প্রোফাইল পিকচার যোগ করা হলো
      },
    };
  }
}