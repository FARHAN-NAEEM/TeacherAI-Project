import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';

function DashboardLayout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* বাম পাশে Sidebar */}
      <Sidebar />
      
      {/* ডান পাশে Header এবং মূল কন্টেন্ট */}
      <div className="flex-1 flex flex-col">
        <Header />
        
        {/* Outlet এর জায়গায় অন্যান্য পেজগুলো (Dashboard, Students ইত্যাদি) রেন্ডার হবে */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;