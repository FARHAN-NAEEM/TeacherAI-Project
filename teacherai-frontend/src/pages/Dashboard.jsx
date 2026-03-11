import { useState, useEffect } from 'react';

function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBatches: 0,
    presentToday: 0,
    absentToday: 0, 
    pendingPayments: 0
  });
  
  const [filterDate, setFilterDate] = useState('');
  const [error, setError] = useState(null);
  
  // 🚀 NEW: State for synchronized payments and local timeline
  const [allPayments, setAllPayments] = useState([]);
  const [localChartData, setLocalChartData] = useState([]);
  const [isFetchingPayments, setIsFetchingPayments] = useState(false);

  const token = localStorage.getItem('teacherToken');

  // 1️⃣ Fetch Core Dashboard Stats (Students, Batches, Attendance)
  useEffect(() => {
    if (!token) return;

    fetch('http://localhost:3000/api/v1/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error("Server connection failed!");
      return res.json();
    })
    .then(response => {
      const dashboardData = response.data || response;
      setStats({
        totalStudents: dashboardData.totalStudents || 0,
        totalBatches: dashboardData.totalBatches || 0,
        presentToday: dashboardData.presentToday || 0,
        absentToday: dashboardData.absentToday || 0, 
        pendingPayments: dashboardData.pendingPayments || 0
      });
      setError(null);
    })
    .catch(err => {
      console.error(err);
      setError("Unable to connect to server. Please check if backend is running.");
    });
  }, [token]); 

  // 2️⃣ 🚀 FIX: Fetch Payments and Calculate Local Timezone Revenue
  useEffect(() => {
    if (!token) return;
    setIsFetchingPayments(true);

    Promise.all([
      fetch(`http://localhost:3000/api/v1/payments`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.ok ? res.json() : { data: [] }),
      fetch(`http://localhost:3000/api/v1/students`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.ok ? res.json() : { data: [] }),
      fetch(`http://localhost:3000/api/v1/batches`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.ok ? res.json() : { data: [] })
    ]).then(([payRes, stdRes, batRes]) => {
      const payments = payRes.data || payRes || [];
      const students = stdRes.data || stdRes || [];
      const batches = batRes.data || batRes || [];

      // 🚀 FIX: Convert UTC ISO string to strictly Local Timezone YYYY-MM-DD
      const getLocalDateString = (isoString) => {
          if(!isoString) return null;
          const d = new Date(isoString);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
      };

      const enrichedPayments = payments.map(p => {
         const student = students.find(s => s._id === p.studentId) || p.studentId || {};
         const batch = batches.find(b => b._id === p.batchId) || p.batchId || {};
         return {
             ...p,
             localDate: getLocalDateString(p.paymentDate || p.createdAt || p.date),
             studentName: student.name || 'Unknown Student',
             batchName: batch.name || 'Unknown Batch'
         };
      });
      
      setAllPayments(enrichedPayments);

      // 🚀 Generate "Recent Revenue Activity" locally to guarantee 100% sync
      const grouped = {};
      enrichedPayments.forEach(p => {
         if(!p.localDate) return;
         
         const statusLower = (p.status || '').toLowerCase();
         if(statusLower !== 'paid' && statusLower !== 'partial') return; // Skip unpaid
         
         if(!grouped[p.localDate]) {
            grouped[p.localDate] = { date: p.localDate, amount: 0, payments: 0, paidStudents: new Set() };
         }
         grouped[p.localDate].amount += Number(p.paidAmount || 0);
         grouped[p.localDate].payments += 1;
         grouped[p.localDate].paidStudents.add(p.studentId?._id || p.studentId);
      });

      const chartArray = Object.values(grouped).map(g => ({
         date: g.date, 
         amount: g.amount,
         payments: g.payments,
         studentsPaid: g.paidStudents.size
      })).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort latest first

      setLocalChartData(chartArray);

    }).catch(err => {
      console.error("Error syncing payments:", err);
    }).finally(() => {
      setIsFetchingPayments(false);
    });
  }, [token]);

  // 🚀 Safe Date formatter to avoid off-by-one timezone issues
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getGradientColor = (index) => {
    const colors = [
      'from-blue-500 to-cyan-400 text-blue-50',
      'from-green-500 to-emerald-400 text-green-50',
      'from-purple-500 to-fuchsia-400 text-purple-50',
      'from-orange-500 to-amber-400 text-orange-50',
      'from-pink-500 to-rose-400 text-pink-50'
    ];
    return colors[index % colors.length];
  };

  const getIconColor = (index) => {
    const colors = ['text-blue-500 bg-blue-50', 'text-green-500 bg-green-50', 'text-purple-500 bg-purple-50', 'text-orange-500 bg-orange-50', 'text-pink-500 bg-pink-50'];
    return colors[index % colors.length];
  };

  // 🚀 Dynamic calculations for the Active Filtered Date
  const dailyPayments = filterDate 
    ? allPayments.filter(p => p.localDate === filterDate && ['paid', 'partial'].includes((p.status || '').toLowerCase()))
    : [];

  const totalRevenueToday = dailyPayments.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
  const paymentsCount = dailyPayments.length;
  const partialCount = dailyPayments.filter(p => (p.status || '').toLowerCase() === 'partial').length;

  return (
    <div className="p-4 md:p-2 space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">Overview</h1>
          <p className="text-gray-500 font-medium mt-1">Welcome back! Here is what's happening today.</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50/80 border border-red-200 text-red-600 px-5 py-4 rounded-2xl mb-6 font-semibold shadow-sm flex items-center gap-3">
          <span className="text-xl">⚠️</span> {error}
        </div>
      )}

      {/* TOP STATISTICS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-800">{stats.totalStudents}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Students</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-100 text-purple-600 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-800">{stats.totalBatches}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Active Batches</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-green-100 text-green-600 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-green-600">{stats.presentToday}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Present Today</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-orange-500">{stats.absentToday}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Absent Today</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-red-100 text-red-600 p-3 rounded-2xl group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-red-500">৳{Number(stats.pendingPayments).toLocaleString()}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Pending Fees</p>
          </div>
        </div>
      </div>

      {/* REVENUE SECTION */}
      <div className="mt-10 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
        
        {/* Header Layout */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-100 pb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-800 transition-all">
              {filterDate ? `Revenue for: ${formatDisplayDate(filterDate)}` : "Recent Revenue Activity"}
            </h2>
            <p className="text-gray-400 font-medium text-sm mt-1">
              {filterDate ? "Filtered income details synced from Payments" : "Look up income for any specific day"}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <div className="relative">
              <input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)} 
                className="bg-white border border-gray-200 text-gray-700 font-bold p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition-all"
              />
            </div>
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')} 
                className="bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors shadow-sm"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
        
        <div className="w-full">
          <div className="space-y-4">
            
            {filterDate ? (
              isFetchingPayments ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-blue-500">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold">Syncing data from Payments module...</p>
                </div>
              ) : dailyPayments.length > 0 ? (
                <div className="animate-in fade-in duration-300">
                  
                  {/* REVENUE SUMMARY */}
                  <div className="flex flex-wrap gap-4 mb-6">
                     <div className="bg-emerald-50 border border-emerald-100 px-6 py-4 rounded-2xl flex-1 min-w-[200px] shadow-sm">
                        <p className="text-emerald-600 text-[11px] font-bold uppercase tracking-widest mb-1">Total Revenue Today</p>
                        <h4 className="text-2xl font-black text-emerald-700">৳{totalRevenueToday.toLocaleString()}</h4>
                     </div>
                     <div className="bg-blue-50 border border-blue-100 px-6 py-4 rounded-2xl flex-1 min-w-[200px] shadow-sm">
                        <p className="text-blue-600 text-[11px] font-bold uppercase tracking-widest mb-1">Payments Recorded</p>
                        <h4 className="text-2xl font-black text-blue-700">{paymentsCount}</h4>
                     </div>
                     {partialCount > 0 && (
                       <div className="bg-orange-50 border border-orange-100 px-6 py-4 rounded-2xl flex-1 min-w-[200px] shadow-sm">
                          <p className="text-orange-600 text-[11px] font-bold uppercase tracking-widest mb-1">Partial Payments</p>
                          <h4 className="text-2xl font-black text-orange-700">{partialCount}</h4>
                       </div>
                     )}
                  </div>

                  {/* REVENUE TABLE */}
                  <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                     <div className="overflow-x-auto">
                       <table className="w-full text-left">
                           <thead className="bg-[#F8FAFC] border-b border-gray-100">
                               <tr>
                                   <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Student Name</th>
                                   <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Batch</th>
                                   <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                                   <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                   <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Payment Method</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                               {dailyPayments.map((p, i) => {
                                 const isPaid = (p.status || '').toLowerCase() === 'paid';
                                 return (
                                   <tr key={i} className="hover:bg-blue-50/30 transition-colors h-[60px]">
                                       <td className="px-6 py-4 font-bold text-gray-800">{p.studentName}</td>
                                       <td className="px-6 py-4 font-semibold text-gray-500">{p.batchName}</td>
                                       <td className="px-6 py-4 font-black text-gray-800">৳{p.paidAmount}</td>
                                       <td className="px-6 py-4">
                                           <span className={`px-3 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-widest ${isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                               {p.status}
                                           </span>
                                       </td>
                                       <td className="px-6 py-4 font-semibold text-gray-500 text-right">{p.method || 'Instant Payment'}</td>
                                   </tr>
                                 );
                               })}
                           </tbody>
                       </table>
                     </div>
                  </div>

                </div>
              ) : (
                /* EMPTY STATE */
                <div className="h-[250px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50 animate-in fade-in duration-300">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  <p className="font-bold text-gray-600">No revenue recorded for {formatDisplayDate(filterDate)}.</p>
                  <p className="font-medium text-gray-400 mt-1 text-sm">Try selecting another date.</p>
                </div>
              )
            ) : (
              /* Default View: Recent Timeline */
              isFetchingPayments ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-blue-500">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold">Syncing data...</p>
                </div>
              ) : localChartData.length > 0 ? (
                localChartData.map((data, index) => (
                  <div key={index} className={`flex flex-col md:flex-row justify-between items-start md:items-center p-5 rounded-2xl transition-all hover:shadow-md hover:-translate-y-1 border border-gray-100 bg-gradient-to-r ${getGradientColor(index)} gap-4`}>
                    <div className="flex items-start gap-4 w-full md:w-auto">
                      <div className={`p-3 rounded-xl shrink-0 ${getIconColor(index)}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-0.5">Working Day</p>
                        <h4 className="text-2xl font-black">{data.date}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="bg-black/10 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            Payments: {data.payments}
                          </span>
                          <span className="bg-black/10 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            Students Paid: {data.studentsPaid}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto mt-2 md:mt-0 md:pl-0 pl-[3.25rem]">
                      <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-0.5">Total Income</p>
                      <h4 className="text-3xl font-black">
                        {data.amount.toLocaleString()} <span className="text-lg opacity-90">BDT</span>
                      </h4>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  <p className="font-medium">No revenue data available for this month</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;