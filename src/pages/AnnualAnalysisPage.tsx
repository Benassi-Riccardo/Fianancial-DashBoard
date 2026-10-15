import React from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Card, CardContent } from '@/components/ui/Card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function AnnualAnalysisPage() {
  const { transactions } = useFinanceStore();
  const currentYear = new Date().getFullYear();

  // Aggrega i dati per mese
  const chartData = MESI.map((mese, index) => {
    const meseTxs = transactions.filter(t => {
      const d = new Date(t.data);
      return d.getMonth() === index && d.getFullYear() === currentYear;
    });

    const entrate = meseTxs.filter(t => t.tipo === 'Entrata').reduce((acc, t) => acc + t.importo, 0);
    const uscite = meseTxs.filter(t => t.tipo === 'Spesa').reduce((acc, t) => acc + t.importo, 0);

    return {
      name: mese,
      Entrate: entrate,
      Uscite: uscite,
      Risparmio: entrate - uscite
    };
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Visione Annuale ({currentYear})</h2>
        <p className="text-slate-500 mt-1">Andamento storico di entrate e uscite.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(value) => `€${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                  itemStyle={{ fontWeight: 500 }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="Entrate" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 0}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="Uscite" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444', strokeWidth: 0}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="Risparmio" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
