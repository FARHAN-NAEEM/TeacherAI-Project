import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { join } from 'path'; // 🚀 নতুন ইমপোর্ট
import * as express from 'express'; // 🚀 নতুন ইমপোর্ট

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 🚀 ম্যাজিক: এই অংশটি আপনার 'uploads' ফোল্ডারকে স্ট্যাটিক হিসেবে সার্ভ করবে
  // এখন আপনি http://localhost:3000/uploads/filename.jpg লিঙ্কে ছবি দেখতে পাবেন
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.setGlobalPrefix('api/v1');
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api/v1`);
}
bootstrap();