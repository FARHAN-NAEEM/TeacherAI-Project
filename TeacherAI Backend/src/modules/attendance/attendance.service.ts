import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>
  ) {}

  async takeAttendance(teacherId: string, attendanceData: any[]): Promise<any> {
    const operations: any[] = attendanceData.map(record => ({
      updateOne: {
        filter: { 
          teacherId: new Types.ObjectId(teacherId), 
          studentId: new Types.ObjectId(record.studentId), 
          date: record.date 
        },
        update: { 
          $set: { 
            isPresent: record.isPresent, 
            batchId: new Types.ObjectId(record.batchId) 
          } 
        },
        upsert: true 
      }
    }));

    return await this.attendanceModel.bulkWrite(operations);
  }

  async getAttendanceByDate(teacherId: string, batchId: string, date: string): Promise<any> {
    const filter: any = {
      teacherId: new Types.ObjectId(teacherId),
      batchId: new Types.ObjectId(batchId),
      date: date
    };
    
    return await this.attendanceModel.find(filter).exec();
  }

  async getMonthlyReport(teacherId: string, batchId: string, month: string): Promise<any> {
    const datePattern = new RegExp(`^${month}`);

    return await this.attendanceModel.aggregate([
      {
        $match: {
          teacherId: new Types.ObjectId(teacherId),
          batchId: new Types.ObjectId(batchId),
          date: { $regex: datePattern }
        }
      },
      {
        $group: {
          _id: "$studentId",
          totalClasses: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $eq: ["$isPresent", true] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: "students", 
          localField: "_id",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      { $unwind: "$studentInfo" },
      {
        $project: {
          _id: 0,
          studentId: "$_id",
          studentName: "$studentInfo.name",
          studentRoll: "$studentInfo.roll",
          totalClasses: 1,
          presentDays: 1,
          absentDays: { $subtract: ["$totalClasses", "$presentDays"] },
          percentage: {
            $round: [
              { $multiply: [{ $divide: ["$presentDays", "$totalClasses"] }, 100] },
              1
            ]
          }
        }
      },
      { $sort: { studentRoll: 1 } }
    ]);
  }

  // 🚀 নতুন: স্টুডেন্টের প্রোফাইলের জন্য মান্থলি সামারি (Total, Present, Absent)
  async getStudentMonthlySummary(studentId: string, teacherId: string): Promise<any> {
    const result = await this.attendanceModel.aggregate([
      {
        $match: {
          studentId: new Types.ObjectId(studentId),
          teacherId: new Types.ObjectId(teacherId)
        }
      },
      {
        $group: {
          // 'date' ফিল্ডটি YYYY-MM-DD ফরম্যাটে থাকলে প্রথম 7 ক্যারেক্টার (YYYY-MM) নিয়ে গ্রুপ করবে
          _id: { $substr: ["$date", 0, 7] }, 
          totalClasses: { $sum: 1 },
          present: {
            // isPresent: true অথবা status: 'Present' দুটিই চেক করবে
            $sum: { 
              $cond: [
                { 
                  $or: [
                    { $eq: ["$isPresent", true] }, 
                    { $eq: [{ $toLower: "$status" }, "present"] }
                  ] 
                }, 
                1, 
                0
              ] 
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          monthRaw: "$_id",
          totalClasses: 1,
          present: 1,
          absent: { $subtract: ["$totalClasses", "$present"] }
        }
      },
      { $sort: { monthRaw: -1 } } // লেটেস্ট মাস আগে দেখাবে
    ]);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // YYYY-MM কে "January 2026" ফরম্যাটে কনভার্ট করা
    return result.map(item => {
      const parts = item.monthRaw.split('-');
      if (parts.length === 2) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const monthName = monthNames[monthIndex] || parts[1];
        return {
          month: `${monthName} ${year}`,
          totalClasses: item.totalClasses,
          present: item.present,
          absent: item.absent
        };
      }
      return {
        month: item.monthRaw,
        totalClasses: item.totalClasses,
        present: item.present,
        absent: item.absent
      };
    });
  }
}