import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Batches', path: '/batches', icon: '📚' },
    { name: 'Batch Transfer', path: '/batch-transfer', icon: '🔀' }, 
    { name: 'Students', path: '/students', icon: '🎓' },
    { name: 'ID Cards', path: '/id-cards', icon: '🪪' }, 
    { name: 'Attendance', path: '/attendance', icon: '📝' },
    { name: 'History', path: '/attendance-history', icon: '⏳' }, 
    { name: 'Exams', path: '/exams', icon: '📋' },
    { name: 'Results', path: '/results', icon: '🏆' },
    { name: 'Payments', path: '/payments', icon: '💰' },
    { name: 'Finances', path: '/finances', icon: '💳' }, 
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col shadow-xl">
      <div className="p-6 text-center border-b border-slate-800">
        <h2 className="text-2xl font-black text-blue-400 tracking-tight">TeacherAI</h2>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-2 custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <span className={`text-xl ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className={`font-bold tracking-wide ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-800 text-center">
        <div className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-1">
          Teacher Assistant
        </div>
        <div className="text-blue-500/50 text-[10px] font-medium italic">
          v2.0 - Farhan Edition
        </div>
      </div>
    </div>
  );
}

export default Sidebar;