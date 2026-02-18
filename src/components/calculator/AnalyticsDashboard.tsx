import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
    name: string;
    kps: number;
    accuracy: number;
}

interface AnalyticsDashboardProps {
    data: ChartDataPoint[];
}

export const AnalyticsDashboard = ({ data }: AnalyticsDashboardProps) => {
    const chartData = data.length > 0 ? data : [{ name: 'No Data', kps: 0, accuracy: 0 }];

    return (
        <div className="w-full h-64">
            <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Progress (Last Sessions)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 10,
                        left: -20,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" hide />
                    <YAxis yAxisId="left" stroke="#64748b" domain={[0, 'auto']} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number | string | undefined, name: string | undefined) => [value ?? 0, name === 'kps' ? 'KPS' : 'Accuracy %']}
                        labelFormatter={() => ''}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="kps" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} activeDot={{ r: 8 }} name="KPS" />
                    <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Accuracy %" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
