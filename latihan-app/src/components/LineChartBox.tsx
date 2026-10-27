import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface Point {
  x: number;
  y: number;
  label: string;
}

/** Single-series line: one accent, 2px line, 8px markers, crosshair tooltip, recessive axes. */
export function LineChartBox({ data, unit, xDomain, xTicks, xFormat, refY }: {
  data: Point[];
  unit: string;
  xDomain?: [number, number];
  xTicks?: number[];
  xFormat: (x: number) => string;
  refY?: number;
}) {
  const ys = data.map((d) => d.y).concat(refY ?? []);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const pad = Math.max(1, (hi - lo) * 0.15);
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="x"
            type="number"
            domain={xDomain ?? ['dataMin', 'dataMax']}
            ticks={xTicks}
            tickFormatter={xFormat}
            stroke="var(--line)"
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            domain={[Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)]}
            stroke="transparent"
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            tickLine={false}
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
            contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 0, color: 'var(--fg)' }}
            labelStyle={{ color: 'var(--muted)' }}
            itemStyle={{ color: 'var(--fg)' }}
            labelFormatter={(_, p) => (p?.[0]?.payload as Point | undefined)?.label ?? ''}
            formatter={(v) => [`${String(v).replace('.', ',')} ${unit}`, '']}
            separator=""
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
