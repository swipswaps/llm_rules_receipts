import React, { useMemo } from 'react';
import { ReceiptData } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  receipts: ReceiptData[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

const Dashboard: React.FC<DashboardProps> = ({ receipts }) => {
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    receipts.forEach(r => {
      const cat = r.category || 'Other';
      map.set(cat, (map.get(cat) || 0) + r.totalAmount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [receipts]);

  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    // Sort receipts by date first
    const sorted = [...receipts].sort((a,b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
    sorted.forEach(r => {
        if (!r.transactionDate) return;
        const date = r.transactionDate.slice(5); // MM-DD
        map.set(date, (map.get(date) || 0) + r.totalAmount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [receipts]);

  const totalSpent = receipts.reduce((sum, r) => sum + r.totalAmount, 0);

  if (receipts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-6 text-white shadow-lg shadow-indigo-200">
        <h3 className="text-indigo-100 text-sm font-medium uppercase tracking-wider mb-2">Total Expenses</h3>
        <p className="text-4xl font-bold tracking-tight">${totalSpent.toFixed(2)}</p>
        <div className="mt-8 flex items-center gap-2 text-indigo-200 text-sm">
           <span className="px-2 py-1 bg-white/20 rounded text-white font-semibold">{receipts.length}</span>
           receipts scanned
        </div>
      </div>

      {/* Category Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
        <h3 className="text-slate-700 font-semibold mb-4">Spending by Category</h3>
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:col-span-2 lg:col-span-1">
        <h3 className="text-slate-700 font-semibold mb-4">Recent Activity</h3>
        <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                    <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#94a3b8" />
                    <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                    <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
