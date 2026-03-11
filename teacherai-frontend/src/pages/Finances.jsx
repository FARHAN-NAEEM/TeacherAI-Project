import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Plus, Wallet, TrendingUp, TrendingDown, Banknote, 
  ArrowUpRight, Sparkles, CheckCircle2, X, Eye, Upload, Image as ImageIcon 
} from 'lucide-react';

function Finances() {
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [viewReceipt, setViewReceipt] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '', category: 'যাতায়াত', amount: '', date: new Date().toISOString().split('T')[0], note: '', receipt: null
  });

  const token = localStorage.getItem('teacherToken');
  const BASE_URL = 'http://localhost:3000';

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [expRes, payRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/expenses`, { headers }),
        fetch(`${BASE_URL}/api/v1/payments`, { headers })
      ]);
      const expRaw = await expRes.json();
      const payRaw = await payRes.json();
      setExpenses(Array.isArray(expRaw) ? expRaw : (expRaw.data || []));
      setPayments(Array.isArray(payRaw) ? payRaw : (payRaw.data || []));
    } catch (error) { console.error("Fetch error:", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFinancialData(); }, [token]);

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData(); 
      data.append('title', formData.title);
      data.append('category', formData.category);
      data.append('amount', formData.amount);
      data.append('date', formData.date);
      data.append('note', formData.note);
      // 🚀 Backend field name 'receiptImage' এর সাথে সিঙ্ক করা হয়েছে
      if (formData.receipt) data.append('receiptImage', formData.receipt); 

      const response = await fetch(`${BASE_URL}/api/v1/expenses`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data,
      });

      if (!response.ok) throw new Error('Failed to save expense');

      setShowExpenseModal(false);
      setFormData({ title: '', category: 'যাতায়াত', amount: '', date: new Date().toISOString().split('T')[0], note: '', receipt: null });
      fetchFinancialData();
      alert('নতুন খরচ ও ভাউচার সফলভাবে যোগ করা হয়েছে! 🎉');
    } catch (err) { alert(`Error: ${err.message}`); } 
    finally { setSaving(false); }
  };

  // 🚀 গ্রাফ এবং স্ট্যাটাস ক্যালকুলেশন লজিক
  const stats = useMemo(() => {
    const totalExp = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalInc = payments.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
    
    // Category mapping for Pie Chart
    const categoryMap = {};
    expenses.forEach(exp => {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + Number(exp.amount || 0);
    });
    const pieData = Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));

    // Date mapping for Cash Flow Graph
    const dateMap = {};
    const process = (list, key, field) => {
      list.forEach(item => {
        const d = new Date(item.date || item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        if (!dateMap[d]) dateMap[d] = { date: d, Income: 0, Expense: 0, ts: new Date(item.date || item.createdAt).getTime() };
        dateMap[d][key] += Number(item[field] || 0);
      });
    };
    process(payments, 'Income', 'paidAmount');
    process(expenses, 'Expense', 'amount');
    const flowData = Object.values(dateMap).sort((a, b) => a.ts - b.ts);

    return { totalIncome: totalInc, totalExpense: totalExp, netProfit: totalInc - totalExp, cashFlowData: flowData, expensePieData: pieData };
  }, [expenses, payments]);

  return (
    <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        {/* হেডার */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="bg-indigo-600 p-2 rounded-xl shadow-lg"><Wallet className="text-white w-6 h-6" /></span>
              Financial Dashboard
            </h1>
            <p className="text-slate-500 font-medium mt-1 text-sm">Enterprise Budget & Voucher Management</p>
          </div>
          <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">
            <Plus className="w-5 h-5" /> Add New Expense
          </button>
        </div>

        {/* কার্ড সামারি */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { title: 'Total Income', val: stats.totalIncome, icon: <TrendingUp />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { title: 'Total Expense', val: stats.totalExpense, icon: <TrendingDown />, color: 'text-rose-600', bg: 'bg-rose-50' },
            { title: 'Net Profit', val: stats.netProfit, icon: <ArrowUpRight />, color: 'text-blue-400', bg: 'bg-slate-900', dark: true },
            { title: 'Balance', val: stats.netProfit, icon: <Banknote />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          ].map((c, i) => (
            <div key={i} className={`p-6 rounded-[24px] border border-slate-100 shadow-sm transition-all hover:shadow-xl ${c.dark ? 'bg-slate-900 text-white' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest ${c.dark ? 'text-blue-400' : 'text-slate-400'}`}>{c.title}</span>
                <div className={`p-2 rounded-lg ${c.bg} ${c.color}`}>{c.icon}</div>
              </div>
              <h3 className="text-3xl font-black">৳{c.val.toLocaleString()}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* 🚀 চার্ট সেকশন ফিরিয়ে আনা হয়েছে */}
            <div className="bg-white p-8 rounded-[28px] border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Cash Flow Analysis</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.cashFlowData}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/><stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Income" stroke="#10B981" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} />
                    <Area type="monotone" dataKey="Expense" stroke="#F43F5E" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* রিসেন্ট এক্সপেন্স টেবিল: ভাউচার ভিউ সহ */}
            <div className="bg-white p-8 rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Recent Expenses</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="pb-4">Expense Title</th>
                      <th className="pb-4">Category</th>
                      <th className="pb-4">Voucher</th>
                      <th className="pb-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {expenses.slice(0, 10).map((exp, idx) => (
                      <tr key={idx}>
                        <td className="py-4 font-bold text-slate-700">{exp.title}</td>
                        <td className="py-4"><span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">{exp.category}</span></td>
                        <td className="py-4">
                          {exp.receiptImage ? (
                            <button onClick={() => setViewReceipt(`${BASE_URL}${exp.receiptImage}`)} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-black uppercase text-[10px] transition-all bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                              <ImageIcon size={14} /> View
                            </button>
                          ) : <span className="text-[10px] font-bold text-slate-300 uppercase ml-2">Empty</span>}
                        </td>
                        <td className="py-4 text-right font-black text-rose-500">-৳{exp.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* AI Insights & Breakdown */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[28px] text-white shadow-xl">
               <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2"><Sparkles size={16} /> AI Insights</h3>
               <div className="p-4 bg-white/10 rounded-2xl border border-white/10 mb-4">
                  <p className="text-[10px] font-bold uppercase text-indigo-200 mb-1">Status</p>
                  <p className="text-xl font-black">{stats.netProfit > 0 ? "Profitable" : "Loss"}</p>
               </div>
               <p className="text-xs font-medium text-indigo-100 italic">"আপনার ইনকাম ব্যয়ের চেয়ে {(stats.totalIncome / (stats.totalExpense || 1)).toFixed(1)} গুণ বেশি।"</p>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 ৫. Add Expense Modal: রিসিপ্ট আপলোড অপশন সহ */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Add New Expense</h2>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-8 space-y-5">
              <input required type="text" placeholder="Expense Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
              <div className="grid grid-cols-2 gap-4">
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold">
                  <option>যাতায়াত</option><option>নাস্তা</option><option>বিল</option><option>বেতন</option><option>অন্যান্য</option>
                </select>
                <input required type="number" placeholder="Amount (৳)" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-black text-indigo-600" />
              </div>
              
              {/* 🚀 ভাউচার আপলোড বাটন */}
              <div onClick={() => fileInputRef.current.click()} className="w-full bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-all">
                <Upload size={20} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500">{formData.receipt ? formData.receipt.name : "Upload Voucher (Optional)"}</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFormData({...formData, receipt: e.target.files[0]})} />

              <button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all">
                {saving ? "Saving..." : <><CheckCircle2 size={18} /> Confirm Payment</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 ৬. Receipt View Modal: বড় করে দেখার জন্য */}
      {viewReceipt && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={() => setViewReceipt(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewReceipt(null)} className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black uppercase text-xs transition-transform hover:scale-110">Close <X size={24}/></button>
            <img src={viewReceipt} alt="Voucher" className="w-full h-auto max-h-[85vh] object-contain rounded-3xl shadow-2xl border-4 border-white/10" />
            <div className="mt-6 text-center">
               <a href={viewReceipt} target="_blank" rel="noreferrer" className="bg-white/20 hover:bg-white/30 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all">Open Full Resolution</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finances;