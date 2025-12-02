import React from 'react';
import { ReceiptData } from '../types';
import { Receipt, Calendar, DollarSign, Tag, CheckCircle } from 'lucide-react';

interface ReceiptCardProps {
  data: ReceiptData;
}

const ReceiptCard: React.FC<ReceiptCardProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
        <div className="flex gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg h-fit">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{data.merchantName}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{data.transactionDate || 'No Date'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold text-slate-900">
            {data.currency}{data.totalAmount.toFixed(2)}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
             <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
               data.confidenceScore > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
             }`}>
               {data.confidenceScore}% Confidence
             </span>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 overflow-auto">
        <div className="mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                {data.category || 'Uncategorized'}
            </span>
        </div>

        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-2 py-2 font-medium">Item</th>
              <th className="px-2 py-2 font-medium text-right">Qty</th>
              <th className="px-2 py-2 font-medium text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-2 py-3 text-slate-700">{item.description}</td>
                <td className="px-2 py-3 text-right text-slate-500">{item.qty || 1}</td>
                <td className="px-2 py-3 text-right font-medium text-slate-900">
                  {data.currency}{item.price.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {data.items.length === 0 && (
            <div className="text-center py-8 text-slate-400 italic">
                No individual items detected
            </div>
        )}
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
        Parsed by Gemini 2.5 Flash
      </div>
    </div>
  );
};

export default ReceiptCard;
