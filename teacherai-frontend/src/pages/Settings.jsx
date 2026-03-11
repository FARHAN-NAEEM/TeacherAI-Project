import { useState, useEffect } from 'react';

function Settings() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    instituteName: '',
    signature: '',
    profilePicture: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const token = localStorage.getItem('teacherToken');

  // টিচারের ব্যক্তিগত ডাটা লোড করা
  useEffect(() => {
    fetch('http://localhost:3000/api/v1/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setFormData({
        name: data.name || '',
        email: data.email || '',
        instituteName: data.instituteName || '',
        signature: data.signature || '',
        profilePicture: data.profilePicture || ''
      });
    })
    .catch(err => console.error("Profile Load Error:", err));
  }, [token]);

  // সিগনেচার ফাইলকে Base64 এ কনভার্ট করা
  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) {
        alert("সিগনেচারের সাইজ ৫০০ কেবি-র কম হতে হবে।");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, signature: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // প্রোফাইল পিকচার ফাইলকে Base64 এ কনভার্ট করা
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1000000) {
        alert("প্রোফাইল ছবির সাইজ ১ এমবি-র কম হতে হবে।");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePicture: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // ডাটা সেভ করার ফাংশন
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          instituteName: formData.instituteName,
          signature: formData.signature,
          profilePicture: formData.profilePicture
        })
      });

      if (response.ok) {
        setMessage({ text: '✅ সেটিংস সফলভাবে সেভ হয়েছে!', type: 'success' });
      } else {
        setMessage({ text: '❌ সেভ করতে সমস্যা হয়েছে।', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: '❌ সার্ভার এরর!', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Profile & Branding</h1>
        <p className="text-gray-500 font-medium mt-1">আপনার প্রতিষ্ঠানের নাম এবং সিগনেচার সেটআপ করুন</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl font-black text-center animate-pulse ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* ইনফরমেশন কার্ড */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-fit text-center">
          
          {/* স্মার্ট প্রোফাইল পিকচার আপলোডার */}
          <div className="relative w-28 h-28 mx-auto mb-4 group cursor-pointer">
            {formData.profilePicture ? (
              <img src={formData.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover shadow-lg shadow-blue-100 border-4 border-white" />
            ) : (
              <div className="w-full h-full bg-blue-600 text-white rounded-full flex items-center justify-center text-4xl font-black shadow-lg shadow-blue-100 border-4 border-white">
                {formData.name ? formData.name.charAt(0).toUpperCase() : 'T'}
              </div>
            )}
            
            <div className="absolute inset-0 bg-slate-900/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
              <svg className="w-6 h-6 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="text-white text-[10px] font-black uppercase tracking-widest">Change</span>
            </div>
            
            <input type="file" accept="image/*" onChange={handleProfilePicChange} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Profile Picture" />
          </div>

          <h2 className="text-xl font-black text-gray-800">{formData.name || 'Teacher Name'}</h2>
          <p className="text-gray-400 text-sm font-medium mb-6">{formData.email}</p>
          <div className="bg-slate-50 p-5 rounded-2xl text-slate-500 text-xs font-bold leading-relaxed border border-slate-100">
            এখানের "প্রতিষ্ঠানের নাম" এবং "সিগনেচার" সরাসরি আপনার এটেন্ডেন্স রিপোর্ট পিডিএফে প্রিন্ট হবে। তাই সঠিক তথ্য দিন।
          </div>
        </div>

        {/* সেটিংস ফর্ম */}
        <form onSubmit={handleSubmit} className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8">
          <div className="space-y-3">
            <label className="text-sm font-black text-gray-400 uppercase tracking-widest">প্রতিষ্ঠানের নাম</label>
            <input 
              type="text" 
              className="w-full border-2 border-gray-50 p-4 rounded-2xl bg-gray-50 outline-none focus:ring-4 focus:ring-blue-50/50 focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-700 placeholder:text-gray-300"
              placeholder="যেমন: Farhan ICT Academy"
              value={formData.instituteName}
              onChange={(e) => setFormData({...formData, instituteName: e.target.value})}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-black text-gray-400 uppercase tracking-widest">ডিজিটাল সিগনেচার</label>
            <div className="border-2 border-dashed border-gray-200 p-8 rounded-3xl bg-gray-50 hover:bg-blue-50/30 transition-all relative group cursor-pointer overflow-hidden">
              {formData.signature ? (
                <div className="text-center">
                  <img src={formData.signature} alt="Signature Preview" className="max-h-28 mx-auto rounded-xl mb-3 shadow-sm bg-white p-2" />
                  <p className="text-blue-600 text-xs font-black bg-blue-50 py-2 px-4 rounded-full inline-block">পরিবর্তন করতে ক্লিক করুন</p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  </div>
                  <p className="text-gray-400 font-black text-sm uppercase tracking-wide">সিগনেচার ফাইল আপলোড করুন</p>
                  <p className="text-gray-300 text-xs mt-1">PNG বা JPG ফরম্যাট (সর্বোচ্চ ৫০০কেবি)</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleSignatureChange} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
          >
            {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'সব তথ্য সেভ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Settings;