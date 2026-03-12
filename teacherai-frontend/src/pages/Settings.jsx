import { useState, useEffect } from 'react';
import { CheckCircle2, Save, AlertCircle } from 'lucide-react'; 

function Settings() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    instituteName: '',
    signature: '',
    profilePicture: '',
    shortName: '',
    establishedYear: '',
    address: '',
    institutionEmail: '',
    phone: '',
    website: '',
    logo: '',
    useSignatureAsDefault: true
  });

  const [buttonState, setButtonState] = useState('default'); // 'default' | 'saving' | 'saved'
  const [toast, setToast] = useState({ show: false, text: '', type: '' });
  const [uploading, setUploading] = useState({ logo: false, signature: false });
  
  // 🚀 NEW: Unsaved Changes Tracker
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const token = localStorage.getItem('teacherToken');

  // 🚀 UX: Browser Warning on Unsaved Changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome to show the prompt
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load Data
  useEffect(() => {
    fetch('http://localhost:3000/api/v1/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      const formatImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `http://localhost:3000${url}`;
      };

      setFormData({
        name: data.name || '',
        email: data.email || '',
        instituteName: data.instituteName || '',
        signature: formatImageUrl(data.signature),
        profilePicture: data.profilePicture || '',
        shortName: data.shortName || '',
        establishedYear: data.establishedYear || '',
        address: data.address || '',
        institutionEmail: data.institutionEmail || '',
        phone: data.phone || '',
        website: data.website || '',
        logo: formatImageUrl(data.logo),
        useSignatureAsDefault: data.useSignatureAsDefault !== false
      });
    })
    .catch(err => console.error("Profile Load Error:", err));
  }, [token]);

  // 🚀 Track Input Changes dynamically
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true); // Flag unsaved changes
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1000000) {
        showToast("Profile picture size must be less than 1MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePicture: reader.result });
        setHasUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2000000) {
      showToast("File size must be less than 2MB.", "error");
      return;
    }

    setUploading({ ...uploading, [field]: true });
    const uploadData = new FormData();
    uploadData.append(field, file);

    try {
      const response = await fetch(`http://localhost:3000/api/v1/auth/upload-${field}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setFormData(prev => ({ 
          ...prev, 
          [field]: `http://localhost:3000${updatedProfile[field]}` 
        }));
        // 🚀 UX: Image Upload Feedback
        showToast(`${field === 'logo' ? 'Logo' : 'Signature'} uploaded successfully!`, 'success');
      } else {
        showToast("Failed to upload file.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error occurred!", "error");
    } finally {
      setUploading({ ...uploading, [field]: false });
    }
  };

  const showToast = (text, type) => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: '' }), 3500);
  };

  const handleSubmit = async (e) => {
    if(e) e.preventDefault();
    setButtonState('saving'); 
    
    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          instituteName: formData.instituteName,
          profilePicture: formData.profilePicture,
          shortName: formData.shortName,
          establishedYear: formData.establishedYear,
          address: formData.address,
          institutionEmail: formData.institutionEmail,
          phone: formData.phone,
          website: formData.website,
          useSignatureAsDefault: formData.useSignatureAsDefault
        })
      });

      if (response.ok) {
        setButtonState('saved'); 
        setHasUnsavedChanges(false); // 🚀 Reset unsaved state
        showToast('Branding information saved successfully!', 'success');
        
        setTimeout(() => {
          setButtonState('default');
        }, 3000);
      } else {
        setButtonState('default');
        showToast('Failed to save branding data.', 'error');
      }
    } catch (error) {
      setButtonState('default');
      showToast('Server error occurred!', 'error');
    }
  };

  return (
    <div className="p-6 md:p-8 bg-[#F8FAFC] min-h-screen relative pb-24">
      
      {/* 🚀 TOAST NOTIFICATION (Floating Top-Right) */}
      {toast.show && (
        <div className="fixed top-8 right-8 z-50 animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success' 
              ? 'bg-slate-900 border-slate-700 text-white' 
              : 'bg-rose-500 border-rose-600 text-white'
          }`}>
            {toast.type === 'success' ? (
              <div className="bg-emerald-500/20 p-1.5 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            ) : (
              <div className="bg-white/20 p-1.5 rounded-full">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
            )}
            <span className="font-bold text-[14px] tracking-wide">{toast.text}</span>
          </div>
        </div>
      )}

      {/* 🚀 STICKY UNSAVED CHANGES BAR (Bottom Floating Action Bar) */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom-full duration-300">
           <div className="bg-slate-900 border-t border-slate-800 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex justify-between items-center px-8 md:px-12">
              <div className="flex items-center gap-3 text-white">
                 <AlertCircle className="w-5 h-5 text-orange-400" />
                 <span className="font-semibold text-sm">You have unsaved changes.</span>
              </div>
              <button 
                onClick={handleSubmit}
                disabled={buttonState !== 'default'}
                className="bg-[#4F6DF5] hover:bg-[#435EE0] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70"
              >
                {buttonState === 'saving' ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...</>
                ) : buttonState === 'saved' ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved ✓</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </button>
           </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto">
        
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
              <span className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              </span>
              Institution Branding
            </h1>
            <p className="text-gray-500 font-medium mt-2 ml-12">Manage your institution profile, branding assets, and contact information.</p>
          </div>
          
          {/* Secondary Top Save Button */}
          {hasUnsavedChanges && (
             <button 
                onClick={handleSubmit}
                className="hidden md:flex bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all items-center gap-2 active:scale-95 shadow-md shadow-emerald-200 animate-in fade-in zoom-in"
              >
                <Save className="w-4 h-4" /> Save Now
              </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Admin Profile */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
              <h3 className="w-full text-left font-bold text-slate-800 text-lg border-b border-slate-100 pb-4 mb-6">Admin Profile</h3>
              
              <div className="relative w-28 h-28 mx-auto mb-4 group cursor-pointer">
                {formData.profilePicture ? (
                  <img src={formData.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover shadow-lg shadow-blue-100 border-4 border-white" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-4xl font-black shadow-lg shadow-blue-100 border-4 border-white">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-900/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">Change</span>
                </div>
                <input type="file" accept="image/*" onChange={handleProfilePicChange} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload Profile Picture" />
              </div>

              <h2 className="text-xl font-black text-gray-800">{formData.name || 'Admin Name'}</h2>
              <p className="text-gray-400 text-sm font-medium mb-6">{formData.email}</p>
              
              <div className="bg-blue-50 p-4 rounded-2xl text-blue-700 text-xs font-bold leading-relaxed border border-blue-100">
                This account manages the institution branding and system settings. Changes made here reflect on all reports.
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Institution Branding Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-800 text-lg">Institution Information</h3>
                <p className="text-gray-500 text-xs mt-1">These details will appear on ID cards, certificates, and PDF documents.</p>
              </div>

              <div className="p-8 space-y-10">
                
                {/* 1. Logo Upload Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1">Institution Logo</h4>
                  <p className="text-xs text-gray-500 mb-4">Upload your institution logo. Recommended size: 300x300px.</p>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-2">
                      {uploading.logo ? (
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : formData.logo ? (
                        <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                      )}
                    </div>
                    <label className="flex-1 border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
                      <svg className="w-6 h-6 text-blue-500 mb-2 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      <span className="text-sm font-bold text-blue-600">Click to upload logo</span>
                      <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</span>
                      <input type="file" accept="image/*" onChange={(e) => handleBrandFileUpload(e, 'logo')} className="hidden" />
                    </label>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* 2. Institution Details */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-4">Institution Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Institution Name</label>
                      <input type="text" className="w-full border-2 border-gray-100 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800" placeholder="e.g. Fahim Academy" value={formData.instituteName} onChange={(e) => handleInputChange('instituteName', e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Short Name (Optional)</label>
                      <input type="text" className="w-full border-2 border-gray-100 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800" placeholder="e.g. FA" value={formData.shortName} onChange={(e) => handleInputChange('shortName', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Establishment Year</label>
                      <input type="text" className="w-full border-2 border-gray-100 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800" placeholder="e.g. 2015" value={formData.establishedYear} onChange={(e) => handleInputChange('establishedYear', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Institution Address</label>
                      <textarea rows="2" className="w-full border-2 border-gray-100 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800 resize-none" placeholder="e.g. Kaliganj, Satkhira" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)}></textarea>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* 3. Contact Information */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-4">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                      <input type="email" className="w-full border-2 border-gray-100 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800" placeholder="info@academy.com" value={formData.institutionEmail} onChange={(e) => handleInputChange('institutionEmail', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                      <input type="text" className="w-full border-2 border-gray-100 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800" placeholder="+880 1XXX XXXXXX" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Website URL (Optional)</label>
                      <input type="text" className="w-full border-2 border-gray-100 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-800" placeholder="www.fahimacademy.com" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* 4. Digital Signature */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1">Authorized Signature</h4>
                  <p className="text-xs text-gray-500 mb-4">Upload the official signature used for certificates and documents.</p>
                  
                  <label className="w-full max-w-sm h-32 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group relative overflow-hidden">
                    {uploading.signature ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : formData.signature ? (
                      <>
                        <img src={formData.signature} alt="Signature" className="h-full object-contain p-4 mix-blend-multiply" />
                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="text-sm font-bold text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm">Replace Signature</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        <span className="text-sm font-bold text-gray-600">Upload Signature</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handleBrandFileUpload(e, 'signature')} className="hidden" />
                  </label>

                  <label className="flex items-center gap-3 mt-4 cursor-pointer w-max">
                    <div className="relative flex items-center">
                      <input type="checkbox" checked={formData.useSignatureAsDefault} onChange={(e) => handleInputChange('useSignatureAsDefault', e.target.checked)} className="sr-only peer" />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                    <span className="text-sm font-bold text-gray-700">Use this signature as default for certificates</span>
                  </label>
                </div>

                {/* 5. Live Branding Preview */}
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                  <h4 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    Live Branding Preview
                  </h4>
                  
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {formData.logo ? (
                        <img src={formData.logo} alt="Logo" className="w-14 h-14 object-contain" />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xs font-bold text-center border border-gray-200">Logo</div>
                      )}
                      <div>
                        <h2 className="text-xl font-black text-gray-800 tracking-tight leading-none mb-1">
                          {formData.instituteName || 'Institution Name'}
                        </h2>
                        <p className="text-xs font-bold text-gray-500">{formData.address || 'Institution Address, City'}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-gray-400">
                          <span>{formData.phone || '+880 1XXX XXXXXX'}</span>
                          {formData.institutionEmail && <span>• {formData.institutionEmail}</span>}
                        </div>
                      </div>
                    </div>
                    
                    {formData.signature && (
                      <div className="text-right">
                        <img src={formData.signature} alt="Signature" className="h-10 object-contain ml-auto opacity-80 mix-blend-multiply" />
                        <div className="w-20 h-px bg-gray-300 mt-1 ml-auto"></div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Authorized</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Submit Button (Bottom) */}
                <div className="pt-4">
                  <button 
                    onClick={handleSubmit}
                    disabled={buttonState !== 'default' || uploading.logo || uploading.signature}
                    className={`w-full py-4 rounded-2xl font-black text-[15px] tracking-wide shadow-xl transition-all active:scale-[0.98] flex justify-center items-center gap-2 ${
                      buttonState === 'saved' 
                        ? 'bg-emerald-500 text-white shadow-emerald-200' 
                        : 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200 disabled:opacity-70 disabled:cursor-not-allowed'
                    }`}
                  >
                    {buttonState === 'saving' && (
                      <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...</>
                    )}
                    {buttonState === 'saved' && (
                      <><CheckCircle2 className="w-5 h-5" /> Saved ✓</>
                    )}
                    {buttonState === 'default' && (
                      <><Save className="w-5 h-5" /> Save Branding Information</>
                    )}
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