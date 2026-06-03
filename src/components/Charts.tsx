import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const COLORS = ['#3B82F6', '#14B8A6', '#6366F1', '#A855F7', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

interface DataBarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  barColor?: string;
}

export function DataBarChart({ data, height = 200, barColor = '#3B82F6' }: DataBarChartProps) {
  const sortedData = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data]);

  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sortedData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748B' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748B' }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '12px',
          }}
          formatter={(value: any) => [Number(value), '数量']}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={barColor} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface BehaviorPieChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

export function BehaviorPieChart({ data, height = 200 }: BehaviorPieChartProps) {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) return null;

  const filteredData = data.filter(d => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={filteredData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={4}
          dataKey="value"
        >
          {filteredData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '12px',
          }}
          formatter={(value: any) => [`${value}条`, '记录数']}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface TrendLineChartProps {
  data: Array<{ date: string; value: number; label?: string }>;
  height?: number;
  color?: string;
  name?: string;
}

export function TrendLineChart({ data, height = 180, color = '#3B82F6', name = '趋势' }: TrendLineChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#64748B' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748B' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '12px',
          }}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} name={name} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface CoverageHeatmapProps {
  students: Array<{ name: string; coverage: { exam: boolean; conversation: boolean; homeVisit: boolean; behavior: boolean } }>;
}

export function CoverageMatrix({ students }: CoverageHeatmapProps) {
  const dimensions = [
    { key: 'exam', label: '📊 成绩', color: '#3B82F6' },
    { key: 'conversation', label: '💬 谈话', color: '#14B8A6' },
    { key: 'homeVisit', label: '🏠 家访', color: '#6366F1' },
    { key: 'behavior', label: '⭐ 行为', color: '#A855F7' },
  ];

  if (!students || students.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-2 text-slate-500 font-medium">学生</th>
            {dimensions.map(d => (
              <th key={d.key} className="text-center py-2 px-2 text-slate-500 font-medium">{d.label}</th>
            ))}
            <th className="text-center py-2 px-2 text-slate-500 font-medium">覆盖度</th>
          </tr>
        </thead>
        <tbody>
          {students.slice(0, 15).map((s, i) => {
            const cov = s.coverage;
            let count = 0;
            if (cov.exam) count++;
            if (cov.conversation) count++;
            if (cov.homeVisit) count++;
            if (cov.behavior) count++;

            return (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-1.5 px-2 text-slate-700 font-medium truncate max-w-[80px]">{s.name}</td>
                {dimensions.map(d => (
                  <td key={d.key} className="text-center py-1.5 px-1">
                    <span
                      className={`inline-block w-5 h-5 rounded-md ${
                        cov[d.key as keyof typeof cov]
                          ? 'shadow-sm'
                          : 'bg-slate-100'
                      }`}
                      style={{
                        backgroundColor: cov[d.key as keyof typeof cov] ? d.color : undefined,
                        opacity: cov[d.key as keyof typeof cov] ? 1 : 0.3,
                      }}
                      title={`${d.label}: ${cov[d.key as keyof typeof cov] ? '✅ 有数据' : '❌ 无数据'}`}
                    />
                  </td>
                ))}
                <td className="text-center py-1.5 px-2">
                  <span className={`text-xs font-bold ${count >= 3 ? 'text-emerald-600' : count >= 1 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {count}/4
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {students.length > 15 && (
        <p className="text-xs text-slate-400 text-center pt-2">...等共 {students.length} 名学生</p>
      )}
    </div>
  );
}
