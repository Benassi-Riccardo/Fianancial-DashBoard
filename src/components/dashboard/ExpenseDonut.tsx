import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useFinanceStore } from '@/store/useFinanceStore';

const COLORS = ['#0ea5e9', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function ExpenseDonut() {
  const { transactions, selectedMonth, selectedYear } = useFinanceStore();

  const currentMonth = selectedMonth;
  const currentYear = selectedYear;

  const expenses = transactions.filter(t => {
    const d = new Date(t.data);
    return t.tipo === 'Spesa' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.importo;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Spese per Categoria (Mese)</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        {data.length > 0 ? (
          // Explicit pixel height so ResponsiveContainer can measure correctly (avoids -1 width/height warning)
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => `€${Number(value).toFixed(2)}`}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Nessuna spesa registrata questo mese.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
