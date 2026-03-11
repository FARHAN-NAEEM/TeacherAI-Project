import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: 'Loading...', picture: '' });

  useEffect(() => {
    const token = localStorage.getItem('teacherToken');
    if (token) {
      fetch('http://localhost:3000/api/v1/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.name) {
          setProfile({
            name: data.name,
            picture: data.profilePicture || ''
          });
        } else {
          setProfile({ name: 'Teacher Panel', picture: '' });
        }
      })
      .catch(err => {
        console.error("Profile load error:", err);
        setProfile({ name: 'Teacher Panel', picture: '' });
      });
    }
  }, []);

  const handleLogout = () => {
    // টোকেন মুছে দিয়ে লগইন পেজে পাঠিয়ে দেওয়া
    localStorage.removeItem('teacherToken');
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm h-20 flex items-center justify-between px-8 border-b border-slate-100 z-10 relative">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Overview</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Teacher Dashboard</p>
      </div>
      
      <div className="flex items-center space-x-5">
        
        {/* 🚀 ডাইনামিক টিচার প্রোফাইল প্যানেল */}
        <div className="flex items-center space-x-3 bg-slate-50 py-1.5 pl-1.5 pr-4 rounded-full border border-slate-100 shadow-sm transition-all hover:bg-slate-100 cursor-default">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-inner border-2 border-white">
            {profile.picture ? (
              <img src={profile.picture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 leading-none mb-1">Welcome back,</span>
            <span className="text-sm font-black text-slate-700 leading-none">{profile.name}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="bg-rose-50 text-rose-600 px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 shadow-sm border border-rose-100"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;