"import { useEffect, useState } from \"react\";
import Navbar from \"@/components/Navbar\";
import { api } from \"@/lib/api\";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from \"recharts\";
import { motion } from \"framer-motion\";
import ChatAssistant from \"@/components/ChatAssistant\";

const RISK_COLORS = { low: \"#00FF88\", moderate: \"#F4D03F\", high: \"#FF3B30\" };

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    api.get(\"/analytics/overview\").then((r) => setOverview(r.data));
    api.get(\"/analytics/districts\").then((r) => setDistricts(r.data));
    api.get(\"/analytics/yield-trend\").then((r) => setTrend(r.data));
  }, []);

  const dist = overview?.risk_distribution || { low: 0, moderate: 0, high: 0 };
  const pieData = [
    { name: \"Low\", value: dist.low, fill: RISK_COLORS.low },
    { name: \"Moderate\", value: dist.moderate, fill: RISK_COLORS.moderate },
    { name: \"High\", value: dist.high, fill: RISK_COLORS.high },
  ];

  // crude procurement estimate: total villages * avg yield * 100 ha (synthetic)
  const procurement = overview ? (overview.predicted_yield * 100 * (overview.village_count || 0)).toFixed(0) : 0;

  return (
    <div className=\"min-h-screen\">
      <Navbar />
      <main className=\"max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6\">
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
          <span className=\"label-mini\">Government analytics</span>
          <h1 className=\"font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1\">District procurement & risk planning</h1>
          <p className=\"text-white/55 text-sm mt-1\">Aggregate decision-support layered on top of village-level forecasts.</p>
        </motion.div>

        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
          <div className=\"glass p-6 lg:col-span-2\">
            <h3 className=\"font-display font-bold mb-4\">Yield trend (predicted vs actual)</h3>
            <ResponsiveContainer width=\"100%\" height={260}>
              <LineChart data={trend}>
                <CartesianGrid stroke=\"rgba(255,255,255,0.05)\" vertical={false} />
                <XAxis dataKey=\"month\" stroke=\"rgba(255,255,255,0.5)\" fontSize={11} />
                <YAxis stroke=\"rgba(255,255,255,0.5)\" fontSize={11} />
                <Tooltip contentStyle={{ background: \"#14141E\", border: \"1px solid rgba(255,255,255,0.1)\", borderRadius: 8 }} />
                <Legend wrapperStyle={{ color: \"rgba(255,255,255,0.7)\" }} />
                <Line type=\"monotone\" dataKey=\"predicted\" stroke=\"#00FF88\" strokeWidth={2.5} dot={false} />
                <Line type=\"monotone\" dataKey=\"actual\" stroke=\"#00E5FF\" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className=\"glass p-6\">
            <h3 className=\"font-display font-bold mb-4\">Risk distribution</h3>
            <ResponsiveContainer width=\"100%\" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey=\"value\" innerRadius={50} outerRadius={80} stroke=\"none\" paddingAngle={2}>
                  {pieData.map((p) => <Cell key={p.name} fill={p.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: \"#14141E\", border: \"1px solid rgba(255,255,255,0.1)\", borderRadius: 8 }} />
                <Legend wrapperStyle={{ color: \"rgba(255,255,255,0.7)\" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className=\"mt-3 text-xs text-white/55\">Procurement estimate: <span className=\"text-neon-green font-mono\">~{procurement} t</span> across {overview?.village_count} villages.</div>
          </div>
        </div>

        <div className=\"glass p-6\">
          <h3 className=\"font-display font-bold mb-4\">District comparison</h3>
          <ResponsiveContainer width=\"100%\" height={300}>
            <BarChart data={districts}>
              <CartesianGrid stroke=\"rgba(255,255,255,0.05)\" vertical={false} />
              <XAxis dataKey=\"district\" stroke=\"rgba(255,255,255,0.5)\" fontSize={11} />
              <YAxis stroke=\"rgba(255,255,255,0.5)\" fontSize={11} />
              <Tooltip contentStyle={{ background: \"#14141E\", border: \"1px solid rgba(255,255,255,0.1)\", borderRadius: 8 }} />
              <Legend wrapperStyle={{ color: \"rgba(255,255,255,0.7)\" }} />
              <Bar dataKey=\"avg_yield\" fill=\"#00FF88\" radius={[6, 6, 0, 0]} />
              <Bar dataKey=\"avg_confidence\" fill=\"#00E5FF\" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className=\"glass p-6 overflow-x-auto\" data-testid=\"districts-table\">
          <h3 className=\"font-display font-bold mb-4\">District table</h3>
          <table className=\"w-full text-sm\">
            <thead className=\"text-white/55 text-xs uppercase tracking-wider\">
              <tr><th className=\"text-left py-2\">District</th><th className=\"text-right py-2\">Villages</th><th className=\"text-right py-2\">Avg yield (t/ha)</th><th className=\"text-right py-2\">Confidence</th><th className=\"text-right py-2\">Rainfall (mm)</th><th className=\"text-right py-2\">High-risk</th></tr>
            </thead>
            <tbody>
              {districts.map((d) => (
                <tr key={d.district} className=\"border-t border-white/5\">
                  <td className=\"py-2.5 font-medium\">{d.district}</td>
                  <td className=\"py-2.5 text-right\">{d.village_count}</td>
                  <td className=\"py-2.5 text-right text-neon-green font-mono\">{d.avg_yield}</td>
                  <td className=\"py-2.5 text-right font-mono\">{d.avg_confidence}%</td>
                  <td className=\"py-2.5 text-right font-mono\">{d.avg_rainfall}</td>
                  <td className=\"py-2.5 text-right\">{d.high_risk_villages > 0 ? <span className=\"text-danger font-mono\">{d.high_risk_villages}</span> : <span className=\"text-white/40\">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <ChatAssistant />
    </div>
  );
}
"