import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Batches from './pages/Batches';
import Students from './pages/Students';
// Student Profile ইমপোর্ট করা হলো
import StudentProfile from './pages/StudentProfile'; 
import Attendance from './pages/Attendance';
import AttendanceHistory from './pages/AttendanceHistory';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Exams from './pages/Exams';
import ExamResults from './pages/ExamResultsNew.jsx';
import ResultManagement from './pages/ResultManagement.jsx'; 
import Finances from './pages/Finances.jsx';

// ID Cards Generate Route
import IdCards from './pages/IdCards.jsx';

// Batch Transfer পেজ ইমপোর্ট করা হলো
import BatchTransfer from './pages/BatchTransfer.jsx';

// SMS Center পেজ ইমপোর্ট করা হলো
import SmsCenter from './pages/SmsCenter.jsx';

// 🚀 নতুন: OMR Generator পেজ ইমপোর্ট করা হলো
import OmrGenerator from './pages/OmrGenerator.jsx';

import DashboardLayout from './components/layout/DashboardLayout';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Private Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/batches" element={<Batches />} />
          <Route path="/students" element={<Students />} />
          
          {/* Student Profile Route */}
          <Route path="/students/:id/profile" element={<StudentProfile />} />
          
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/attendance-history" element={<AttendanceHistory />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/exams/:examId/results" element={<ExamResults />} />

          {/* Result Management Route */}
          <Route path="/results" element={<ResultManagement />} />
          
          {/* Financial Dashboard Route */}
          <Route path="/finances" element={<Finances />} />

          {/* ID Cards Generate Route */}
          <Route path="/id-cards" element={<IdCards />} />

          {/* Batch Transfer Route */}
          <Route path="/batch-transfer" element={<BatchTransfer />} />

          {/* SMS Center Route */}
          <Route path="/sms-center" element={<SmsCenter />} />

          {/* 🚀 নতুন: OMR Generator Route */}
          <Route path="/omr-generator" element={<OmrGenerator />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;