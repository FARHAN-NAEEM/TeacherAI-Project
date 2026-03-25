import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  History, 
  FileText, 
  Settings as SettingsIcon, 
  Send, 
  Users, 
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Clock,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Save,
  RadioTower
} from 'lucide-react';

function SmsCenter() {
  const [activeTab, setActiveTab] = useState('send'); 
  
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [smsType, setSmsType] = useState('custom'); 
  const [recipient, setRecipient] = useState('both'); 
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [smsHistory, setSmsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const [gateway, setGateway] = useState({
    smsProvider: 'none',
    smsApiKey: '',
    smsSenderId: '',
    smsClientId: ''
  });
  const [loadingGateway, setLoadingGateway] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);

  const [toast, setToast] = useState({ show: false, text: '', type: '' });
  const token = localStorage.getItem('teacherToken');

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/batches', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setBatches(data.data || data))
      .catch(err => console.error(err));
  }, [token]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'templates') {
      fetchTemplates();
    } else if (activeTab === 'settings') {
      fetchGatewaySettings();
    }
  }, [activeTab, token]);

  const fetchHistory = () => {
    setLoadingHistory(true);
    fetch('http://localhost:3000/api/v1/sms/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSmsHistory(data.data || data || []);
        setLoadingHistory(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingHistory(false);
      });
  };

  const fetchTemplates = () => {
    setLoadingTemplates(true);
    fetch('http://localhost:3000/api/v1/sms/templates', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setTemplates(data.data || data || []);
        setLoadingTemplates(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingTemplates(false);
      });
  };

  const fetchGatewaySettings = () => {
    setLoadingGateway(true);
    fetch('http://localhost:3000/api/v1/sms/settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if(data) {
          setGateway({
            smsProvider: data.smsProvider || 'none',
            smsApiKey: data.smsApiKey || '',
            smsSenderId: data.smsSenderId || '',
            smsClientId: data.smsClientId || ''
          });
        }
        setLoadingGateway(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingGateway(false);
      });
  };

  const showToast = (text, type) => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: '' }), 4000);
  };

  const insertVariable = (variable, isTemplate = false) => {
    if (isTemplate) {
      setNewTemplateContent(prev => prev + variable);
    } else {
      setMessage(prev => prev + variable);
    }
  };

  const handleSendSms = async (e) => {
    e.preventDefault();
    if (!selectedBatch || !message) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          batchId: selectedBatch,
          smsType,
          recipientType: recipient,
          message
        })
      });

      const result = await response.json();

      if (response.ok) {
        showToast(result.message || `Success! SMS dispatched to ${result.recipientCount} recipients.`, 'success');
        setMessage(''); 
      } else {
        showToast(result.message || "Failed to send SMS.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error occurred.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateTitle || !newTemplateContent) return;

    setCreatingTemplate(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/sms/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTemplateTitle,
          content: newTemplateContent
        })
      });

      if (response.ok) {
        showToast('Template saved successfully!', 'success');
        setNewTemplateTitle('');
        setNewTemplateContent('');
        fetchTemplates(); 
      } else {
        showToast("Failed to save template.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error occurred.", "error");
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if(!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`http://localhost:3000/api/v1/sms/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showToast('Template deleted successfully!', 'success');
        setTemplates(prev => prev.filter(t => t._id !== id));
      } else {
        showToast("Failed to delete template.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error occurred.", "error");
    }
  };

  const handleUseTemplate = (content) => {
    setMessage(content);
    setActiveTab('send');
    showToast('Template loaded into message box', 'success');
  };

  const handleSaveGateway = async (e) => {
    e.preventDefault();
    setSavingGateway(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/v1/sms/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gateway)
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Settings saved securely!', 'success');
      } else {
        showToast(result.message || "Failed to save settings.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server error occurred.", "error");
    } finally {
      setSavingGateway(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-[#F8FAFC] min-h-screen relative pb-24">
      
      {toast.show && (
        <div className="fixed top-8 right-8 z-50 animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-rose-500 border-rose-600 text-white'
          }`}>
            {toast.type === 'success' ? (
              <div className="bg-emerald-500/20 p-1.5 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div>
            ) : (
              <div className="bg-white/20 p-1.5 rounded-full"><AlertCircle className="w-5 h-5 text-white" /></div>
            )}
            <span className="font-bold text-[14px] tracking-wide">{toast.text}</span>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <span className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
               <MessageSquare className="text-white w-6 h-6" strokeWidth={2.5} />
             </span>
             SMS Center
          </h1>
          <p className="text-slate-500 font-medium mt-2 ml-12">Send announcements, payment reminders, and exam results via SMS.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-max">
          <button onClick={() => setActiveTab('send')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'send' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Send className="w-4 h-4" /> Send SMS
          </button>
          <button onClick={() => setActiveTab('templates')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'templates' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <FileText className="w-4 h-4" /> Templates
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <History className="w-4 h-4" /> SMS History
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <SettingsIcon className="w-4 h-4" /> Gateway Settings
          </button>
        </div>

        {activeTab === 'send' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-lg">Compose Message</h3>
              </div>
              <form onSubmit={handleSendSms} className="p-8 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Batch</label>
                    <select required className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-slate-700 outline-none transition-all" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                      <option value="">-- Select Batch --</option>
                      {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Send To</label>
                    <select className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-slate-700 outline-none transition-all" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                      <option value="student">Student Number Only</option>
                      <option value="guardian">Guardian Number Only</option>
                      <option value="both">Both (Student & Guardian)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">SMS Type</label>
                  <div className="flex flex-wrap gap-3">
                    {['custom', 'payment', 'result'].map((type) => (
                      <label key={type} className={`cursor-pointer px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center gap-2 ${smsType === type ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                        <input type="radio" name="smsType" value={type} checked={smsType === type} onChange={(e) => setSmsType(e.target.value)} className="hidden" />
                        {type === 'custom' && <MessageSquare className="w-4 h-4" />}
                        {type === 'payment' && <Smartphone className="w-4 h-4" />}
                        {type === 'result' && <FileText className="w-4 h-4" />}
                        {type.charAt(0).toUpperCase() + type.slice(1)} SMS
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2 ml-1">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Message Content</label>
                    <span className="text-xs font-bold text-slate-400">{message.length} Characters ({Math.ceil(message.length / 160) || 1} SMS)</span>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                    <div className="p-2 border-b border-slate-200 flex flex-wrap gap-2 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Insert Variables:</span>
                      <button type="button" onClick={() => insertVariable(' {Name} ')} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">{'{Name}'}</button>
                      <button type="button" onClick={() => insertVariable(' {Batch} ')} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">{'{Batch}'}</button>
                      {smsType === 'payment' && (
                        <>
                          <button type="button" onClick={() => insertVariable(' {Amount} ')} className="text-xs font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded hover:bg-rose-100 transition-colors">{'{Amount}'}</button>
                          <button type="button" onClick={() => insertVariable(' {DueDate} ')} className="text-xs font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded hover:bg-rose-100 transition-colors">{'{DueDate}'}</button>
                        </>
                      )}
                      {smsType === 'result' && (
                        <>
                          <button type="button" onClick={() => insertVariable(' {Exam} ')} className="text-xs font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 transition-colors">{'{Exam}'}</button>
                          <button type="button" onClick={() => insertVariable(' {Marks} ')} className="text-xs font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 transition-colors">{'{Marks}'}</button>
                        </>
                      )}
                    </div>
                    <textarea 
                      required
                      rows="5"
                      placeholder="Write your message here..."
                      className="w-full p-4 bg-transparent outline-none font-medium text-slate-700 resize-none"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !selectedBatch || !message}
                  className="w-full py-4 bg-slate-900 text-white font-black rounded-xl text-[15px] tracking-wide shadow-xl hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Send className="w-5 h-5" />}
                  {loading ? 'Sending SMS...' : 'Send SMS Now'}
                </button>

              </form>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden sticky top-6">
                 <div className="bg-slate-900 p-4 text-center">
                   <p className="text-white font-black tracking-widest text-xs uppercase opacity-80">Live Preview</p>
                 </div>
                 <div className="p-6 bg-slate-100 h-[400px] flex justify-center items-center">
                    <div className="w-[260px] h-[380px] bg-white rounded-[2rem] shadow-xl border-[6px] border-slate-800 relative overflow-hidden flex flex-col">
                       <div className="bg-slate-100 p-3 border-b border-slate-200 text-center shrink-0">
                         <p className="text-[10px] font-bold text-slate-500">New Message</p>
                       </div>
                       <div className="p-4 flex-1 overflow-y-auto bg-[#e5ddd5]">
                          <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-800 font-medium whitespace-pre-wrap border border-slate-100 relative">
                             {message || "Your message preview will appear here..."}
                             <p className="text-[8px] text-right mt-2 text-slate-400 font-bold">Just now</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Delivery History</h3>
                <p className="text-slate-500 text-xs mt-1">Track all your sent SMS records.</p>
              </div>
              <div className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1">
                <History className="w-4 h-4" /> {smsHistory.length} Records
              </div>
            </div>

            <div className="p-6">
              {loadingHistory ? (
                 <div className="py-12 flex justify-center items-center text-indigo-500">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
              ) : smsHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Date & Time</th>
                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Batch</th>
                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Recipients</th>
                        <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smsHistory.map((history) => (
                        <tr key={history._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {new Date(history.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-slate-700 text-sm">{history.batchId?.name || 'N/A'}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">
                              {history.smsType}
                            </span>
                          </td>
                          <td className="p-4 font-black text-slate-700">{history.recipientCount} <span className="text-xs font-medium text-slate-400">({history.recipientType})</span></td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${history.status === 'Sent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                              {history.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                   <History className="w-12 h-12 mb-3 opacity-50" />
                   <p className="font-bold text-slate-500 text-lg">No SMS History Found</p>
                   <p className="text-sm font-medium mt-1">You haven't sent any messages yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden sticky top-6">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-500"/> Create Template</h3>
                </div>
                <form onSubmit={handleCreateTemplate} className="p-6 space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Template Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g., Payment Reminder"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-slate-700 outline-none transition-all"
                      value={newTemplateTitle}
                      onChange={(e) => setNewTemplateTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Template Content</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                      <div className="p-2 border-b border-slate-200 flex flex-wrap gap-2 bg-white">
                        <button type="button" onClick={() => insertVariable(' {Name} ', true)} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">{'{Name}'}</button>
                        <button type="button" onClick={() => insertVariable(' {Batch} ', true)} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">{'{Batch}'}</button>
                      </div>
                      <textarea 
                        required
                        rows="6"
                        placeholder="Write template message..."
                        className="w-full p-4 bg-transparent outline-none font-medium text-sm text-slate-700 resize-none"
                        value={newTemplateContent}
                        onChange={(e) => setNewTemplateContent(e.target.value)}
                      ></textarea>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={creatingTemplate || !newTemplateTitle || !newTemplateContent}
                    className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl text-sm tracking-wide shadow-lg hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creatingTemplate ? 'Saving...' : 'Save Template'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {loadingTemplates ? (
                   <div className="col-span-full py-12 flex justify-center items-center text-indigo-500">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                   </div>
                 ) : templates.length > 0 ? (
                   templates.map((template) => (
                     <div key={template._id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-black text-slate-800 text-lg">{template.title}</h4>
                          <button onClick={() => handleDeleteTemplate(template._id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-slate-600 whitespace-pre-wrap mb-6 flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {template.content}
                        </p>
                        <button 
                          onClick={() => handleUseTemplate(template.content)}
                          className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
                        >
                           Use This Template <ArrowRight className="w-4 h-4" />
                        </button>
                     </div>
                   ))
                 ) : (
                   <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                      <FileText className="w-12 h-12 mb-3 opacity-50" />
                      <p className="font-bold text-slate-500 text-lg">No Templates Yet</p>
                      <p className="text-sm font-medium mt-1">Create your first message template from the left panel.</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 p-8 text-white flex items-center gap-4">
                 <div className="bg-white/20 p-3 rounded-2xl"><ShieldCheck className="w-8 h-8" /></div>
                 <div>
                   <h2 className="text-2xl font-black">API Configuration</h2>
                   <p className="text-slate-300 text-sm mt-1">Connect your SMS Gateway securely to send real messages.</p>
                 </div>
              </div>

              {loadingGateway ? (
                 <div className="py-20 flex justify-center items-center text-indigo-500">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
              ) : (
                <form onSubmit={handleSaveGateway} className="p-8 space-y-6">
                  
                  {gateway.smsProvider === 'twilio' && (
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3 text-indigo-800">
                      <RadioTower className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold">Twilio Sandbox Mode Active</p>
                        <p className="text-xs mt-1 opacity-80">You must verify destination phone numbers in your Twilio console before sending messages during the trial period.</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select Provider</label>
                    <select 
                      className="w-full p-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-slate-800 outline-none transition-all cursor-pointer"
                      value={gateway.smsProvider}
                      onChange={(e) => setGateway({...gateway, smsProvider: e.target.value})}
                    >
                      <option value="none">None (Disabled)</option>
                      <option value="twilio">Twilio (Free Trial / Sandbox)</option>
                      <option value="sslwireless">SSL Wireless</option>
                      <option value="bulksms">Bulk SMS BD</option>
                    </select>
                  </div>

                  {gateway.smsProvider !== 'none' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                           {gateway.smsProvider === 'twilio' ? 'Account SID' : 'Client ID (CSMS ID)'}
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder={gateway.smsProvider === 'twilio' ? "Enter Twilio Account SID" : "Enter Client ID"}
                          className="w-full p-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-slate-800 outline-none transition-all"
                          value={gateway.smsClientId}
                          onChange={(e) => setGateway({...gateway, smsClientId: e.target.value})}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                           {gateway.smsProvider === 'twilio' ? 'Auth Token' : 'API Key / Token'}
                        </label>
                        <input 
                          type="password" 
                          required
                          placeholder={gateway.smsProvider === 'twilio' ? "Enter Twilio Auth Token" : "Enter API Key"}
                          className="w-full p-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-slate-800 outline-none transition-all"
                          value={gateway.smsApiKey}
                          onChange={(e) => setGateway({...gateway, smsApiKey: e.target.value})}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                           {gateway.smsProvider === 'twilio' ? 'Twilio Virtual Phone Number' : 'Sender ID'}
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder={gateway.smsProvider === 'twilio' ? "e.g., +1234567890" : "e.g., BRAND_NAME"}
                          className="w-full p-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl font-bold text-slate-800 outline-none transition-all"
                          value={gateway.smsSenderId}
                          onChange={(e) => setGateway({...gateway, smsSenderId: e.target.value})}
                        />
                      </div>

                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    <button 
                      type="submit" 
                      disabled={savingGateway}
                      className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl text-[15px] tracking-wide shadow-xl shadow-indigo-200 hover:bg-slate-900 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {savingGateway ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
                      {savingGateway ? 'Saving Configuration...' : 'Save Configuration'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default SmsCenter;