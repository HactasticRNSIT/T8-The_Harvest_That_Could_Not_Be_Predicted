"import { useEffect, useState } from \"react\";
import { api } from \"@/lib/api\";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from \"recharts\";
import { Cloud, Leaf, ThermometerSun } from \"lucide-react\";

export default function WeatherInsights({ villageId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!villageId) return;
    api.get(`/weather/${villageId}`).then((r) => setData(r.data));
  }, [villageId]);

  if (!villageId) {
    return <div className=\"glass p-6 text-white/50 text-sm\" data-testid=\"weather-empty\">Select a village on the map to view weather & NDVI insights.</div>;
  }
  if (!data) return <div className=\"glass p-6 text-white/50 text-sm\">Loading weather…</div>;

  const series = data.series;

  return (
    <div className=\"glass p-6 space-y-5\" data-testid=\"weather-insights\">
      <div className=\"flex items-center justify-between\">
        <div>
          <div className=\"label-mini\">Satellite + Weather</div>
          <h3 className=\"font-display font-bold mt-0.5\">{data.village.name} · 14-day insight</h3>
        </div>
        <div className=\"flex items-center gap-3 text-xs text-white/70\">
          <span className=\"flex items-center gap-1\"><Leaf className=\"w-3.5 h-3.5 text-neon-green\" /> NDVI</span>
          <span className=\"flex items-center gap-1\"><Cloud className=\"w-3.5 h-3.5 text-neon-cyan\" /> Rain</span>
          <span className=\"flex items-center gap-1\"><ThermometerSun className=\"w-3.5 h-3.5 text-neon-yellow\" /> Temp</span>
        </div>
      </div>

      <div>
        <div className=\"text-xs text-white/55 mb-1\">NDVI vegetation index</div>
        <ResponsiveContainer width=\"100%\" height={140}>
          <AreaChart data={series}>
            <defs>
              <linearGradient id=\"ndvi\" x1=\"0\" x2=\"0\" y1=\"0\" y2=\"1\">
                <stop offset=\"0%\" stopColor=\"#00FF88\" stopOpacity={0.6} />
                <stop offset=\"100%\" stopColor=\"#00FF88\" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke=\"rgba(255,255,255,0.05)\" vertical={false} />
            <XAxis dataKey=\"date\" stroke=\"rgba(255,255,255,0.4)\" fontSize={10} />
            <YAxis stroke=\"rgba(255,255,255,0.4)\" fontSize={10} domain={[0, 1]} />
            <Tooltip contentStyle={{ background: \"#14141E\", border: \"1px solid rgba(255,255,255,0.1)\", borderRadius: 8 }} />
            <Area type=\"monotone\" dataKey=\"ndvi\" stroke=\"#00FF88\" fill=\"url(#ndvi)\" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-4\">
        <div>
          <div className=\"text-xs text-white/55 mb-1\">Rainfall (mm/day)</div>
          <ResponsiveContainer width=\"100%\" height={120}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id=\"rain\" x1=\"0\" x2=\"0\" y1=\"0\" y2=\"1\">
                  <stop offset=\"0%\" stopColor=\"#00E5FF\" stopOpacity={0.6} />
                  <stop offset=\"100%\" stopColor=\"#00E5FF\" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke=\"rgba(255,255,255,0.05)\" vertical={false} />
              <XAxis dataKey=\"date\" hide />
              <YAxis stroke=\"rgba(255,255,255,0.4)\" fontSize={10} />
              <Tooltip contentStyle={{ background: \"#14141E\", border: \"1px solid rgba(255,255,255,0.1)\", borderRadius: 8 }} />
              <Area type=\"monotone\" dataKey=\"rain_mm\" stroke=\"#00E5FF\" fill=\"url(#rain)\" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className=\"text-xs text-white/55 mb-1\">Temperature (°C)</div>
          <ResponsiveContainer width=\"100%\" height={120}>
            <LineChart data={series}>
              <CartesianGrid stroke=\"rgba(255,255,255,0.05)\" vertical={false} />
              <XAxis dataKey=\"date\" hide />
              <YAxis stroke=\"rgba(255,255,255,0.4)\" fontSize={10} />
              <Tooltip contentStyle={{ background: \"#14141E\", border: \"1px solid rgba(255,255,255,0.1)\", borderRadius: 8 }} />
              <Line type=\"monotone\" dataKey=\"temp\" stroke=\"#F4D03F\" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
"