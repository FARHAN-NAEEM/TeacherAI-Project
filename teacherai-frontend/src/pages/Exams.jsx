import { useState, useEffect } from 'react';
import { 
  Building2, 
  UploadCloud, 
  Mail, 
  Phone, 
  Globe, 
  PenTool, 
  Save,
  CheckCircle2
} from 'lucide-react';

function Settings() {
  const token = localStorage.getItem('teacherToken');

  // Admin Profile State
  const [adminProfile, setAdminProfile] = useState({ name: '', email: '' });

  // Institution Branding State
  const [branding, setBranding] = useState({
    instituteName: '',
    shortName: '',
    establishedYear: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    logo: '',
    signature: '',
    useSignatureAsDefault: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Fetch Existing Data
  useEffect(() => {
    fetch('http://localhost:3000/api/v1/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setAdminProfile({
        name: data.name || 'Admin User',
        email: data.email || 'admin@example.com'
      });
      setBranding({
        instituteName: data.instituteName || '',
        shortName: data.shortName || '',
        establishedYear: data.establishedYear || '',
        address: data.address || '',
        email: data.institutionEmail || '',
        phone: data.phone || '',
        website: data.website || '',
        logo: data.logo || '',
        signature: data.signature || '',
        useSignatureAsDefault: data.useSignatureAsDefault !== false
      });
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token]);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBranding(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle Image Upload (Base64)
  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBranding(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Data
  const handleSave = async () => {
    setSaving(true);
    try {
      // Note: Make sure your backend API schema allows these new fields
      const res = await fetch('http://localhost:3000/api/v1/auth/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          instituteName: branding.instituteName,
          shortName: branding.shortName,
          establishedYear: branding.establishedYear,
          address: branding.address,
          institutionEmail: branding.email,
          phone: branding.phone,
          website: branding.website,
          logo: branding.logo,
          signature: branding.signature,
          useSignatureAsDefault: branding.useSignatureAsDefault
        })
      });

      if (res.ok) {
        setMessage({ text: 'Branding information saved successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      } else {
        setMessage({ text: 'Failed to save branding data.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Server error occurred.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><span className="text-blue-600 font-bold animate-pulse">Loading Profile...</span></div>;
  }

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1200px] mx-auto">
        
        {/* 🚀 PAGE HEADER */}
        <div className="mb-8">
          <h1 className="text-[32px] font-black text-slate-900 tracking-tight flex items-center gap-3 mb-1">
            <span className="bg-gradient-to-br from-[#4F6DF5] to-[#6C4DF6] p-2.5 rounded-[12px] shadow-lg shadow-indigo-200">
               <Building2 className="text-white w-6 h-6" strokeWidth={2.5} />
            </span>
            Institution Branding
          </h1>
          <p className="text-slate-500 font-medium text-[14px] ml-[52px]">
            Manage your institution profile, branding assets, and contact information.
          </p>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-[12px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
            <CheckCircle2 className="w-5 h-5" /> {message.text}
          </div>
        )}

        {/* 🚀 MAIN LAYOUT (Two-Column) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Admin Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[20px] shadow-sm border border-slate-100 flex flex-col items-center text-center">
              <h3 className="w-full text-left font-bold text-slate-800 text-lg border-b border-slate-100 pb-4 mb-6">Admin Profile</h3>
              
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-4xl font-black shadow-lg mb-4">
                {adminProfile.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-black text-slate-800">{adminProfile.name}</h2>
              <p className="text-slate-500 font-medium text-sm mt-1">{adminProfile.email}</p>
              
              <div className="mt-6 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[12px] font-medium text-blue-700 leading-relaxed">
                  This account manages the institution branding and system settings. Changes made here will reflect globally.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Institution Branding Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-lg">Institution Information</h3>
                <p className="text-slate-500 text-xs mt-1">Information provided here will be used in ID Cards, Certificates, and PDFs.</p>
              </div>

              <div className="p-8 space-y-10">
                
                {/* SECTION 1: Institution Logo */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Institution Logo</h4>
                  <p className="text-xs text-slate-500 mb-4">Upload your institution logo. Recommended size: 300x300px.</p>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-[16px] border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {branding.logo ? (
                        <img src={branding.logo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                      ) : (
                        <Building2 className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <label className="flex-1 border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-[16px] p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                      <UploadCloud className="w-6 h-6 text-blue-500 mb-2 group-hover:-translate-y-1 transition-transform" />
                      <span className="text-sm font-bold text-blue-600">Click to upload logo</span>
                      <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="hidden" />
                    </label>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* SECTION 2: Institution Details */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Institution Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Institution Name</label>
                      <input type="text" name="instituteName" value={branding.instituteName} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[12px] font-semibold text-slate-800 outline-none transition-all" placeholder="e.g. Fahim Academy" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Short Name (Optional)</label>
                      <input type="text" name="shortName" value={branding.shortName} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[12px] font-semibold text-slate-800 outline-none transition-all" placeholder="e.g. FA" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Establishment Year</label>
                      <input type="text" name="establishedYear" value={branding.establishedYear} onChange={handleChange} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[12px] font-semibold text-slate-800 outline-none transition-all" placeholder="e.g. 2015" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Institution Address</label>
                      <textarea name="address" value={branding.address} onChange={handleChange} rows="2" className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[12px] font-semibold text-slate-800 outline-none transition-all resize-none" placeholder="e.g. Kaliganj, Satkhira"></textarea>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* SECTION 3: Contact Information */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="email" name="email" value={branding.email} onChange={handleChange} className="w-full pl-11 p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[12px] font-semibold text-slate-800 outline-none transition-all" placeholder="info@academy.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" name="phone" value={branding.phone} onChange={handleChange} className="w-full pl-11 p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[12px] font-semibold text-slate-800 outline-none transition-all" placeholder="+880 1XXX XXXXXX" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Website URL (Optional)</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" name="website" value={branding.website} onChange={handleChange} className="w-full pl-11 p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F6DF5] focus:ring-2 focus:ring-indigo-50 rounded-[12px] font-semibold text-slate-800 outline-none transition-all" placeholder="www.fahimacademy.com" />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* SECTION 4: Digital Signature */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Authorized Signature</h4>
                  <p className="text-xs text-slate-500 mb-4">Upload the official signature used for certificates and documents.</p>
                  
                  <label className="w-full max-w-sm h-32 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-[16px] flex flex-col items-center justify-center cursor-pointer transition-colors group relative overflow-hidden">
                    {branding.signature ? (
                      <div className="absolute inset-0 bg-white flex items-center justify-center group-hover:opacity-50 transition-opacity">
                        <img src={branding.signature} alt="Signature" className="h-full object-contain p-4" />
                      </div>
                    ) : null}
                    <div className={`flex flex-col items-center z-10 ${branding.signature ? 'opacity-0 group-hover:opacity-100 bg-white/80 p-2 rounded-lg' : ''}`}>
                      <PenTool className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-sm font-bold text-slate-600">{branding.signature ? 'Replace Signature' : 'Upload Signature'}</span>
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'signature')} className="hidden" />
                  </label>

                  <label className="flex items-center gap-3 mt-4 cursor-pointer w-max">
                    <div className="relative flex items-center">
                      <input type="checkbox" name="useSignatureAsDefault" checked={branding.useSignatureAsDefault} onChange={handleChange} className="sr-only peer" />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4F6DF5]"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700">Use this signature as default for certificates</span>
                  </label>
                </div>

                {/* SECTION 5: Live Branding Preview */}
                <div className="bg-slate-50 p-6 rounded-[20px] border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    Live Branding Preview
                  </h4>
                  
                  {/* Preview Card representing a document header */}
                  <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        {branding.logo ? (
                          <img src={branding.logo} alt="Logo" className="w-14 h-14 object-contain" />
                        ) : (
                          <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 text-xs text-center border border-slate-200">No<br/>Logo</div>
                        )}
                        <div>
                          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">
                            {branding.instituteName || 'Your Institution Name'}
                          </h2>
                          <p className="text-xs font-semibold text-slate-500">{branding.address || 'Institution Address, City, Region'}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-medium text-slate-400">
                            <span>{branding.phone || '+880 1XXX XXXXXX'}</span>
                            {branding.email && <span>• {branding.email}</span>}
                          </div>
                        </div>
                      </div>
                      
                      {branding.signature && (
                        <div className="text-right">
                          <img src={branding.signature} alt="Signature" className="h-10 object-contain ml-auto opacity-80" />
                          <div className="w-20 h-px bg-slate-300 mt-1 ml-auto"></div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SAVE BUTTON */}
                <div className="pt-4">
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-[#4F6DF5] to-[#6C4DF6] text-white py-4 rounded-[14px] font-black text-[15px] tracking-wide shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving Information...' : <><Save className="w-5 h-5" /> Save Branding Information</>}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Settings;