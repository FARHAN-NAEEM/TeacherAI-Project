import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import * as fs from 'fs';

@Injectable()
export class NotesService {
  constructor(@InjectModel(Note.name) private noteModel: Model<Note>) {}

  async create(createNoteDto: CreateNoteDto, file: Express.Multer.File, teacherId: string) {
    const fileUrl = `/uploads/notes/${file.filename}`; // ফাইলের পাথ

    const newNote = new this.noteModel({
      ...createNoteDto,
      fileUrl,
      batch: new Types.ObjectId(createNoteDto.batch),
      createdBy: new Types.ObjectId(teacherId),
    });
    return newNote.save();
  }

  async findAllByBatch(batchId: string, teacherId: string) {
    return this.noteModel.find({
      batch: new Types.ObjectId(batchId),
      createdBy: new Types.ObjectId(teacherId),
    }).sort({ createdAt: -1 }).exec();
  }

  async remove(id: string, teacherId: string) {
    const note = await this.noteModel.findOne({ _id: id, createdBy: new Types.ObjectId(teacherId) });
    if (!note) throw new NotFoundException('Note not found');

    // লোকাল ফোল্ডার থেকে ফাইল ডিলিট করার লজিক
    const filePath = `.${note.fileUrl}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.noteModel.deleteOne({ _id: id });
    return { message: 'Note and file deleted successfully' };
  }
}