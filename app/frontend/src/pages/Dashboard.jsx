"import { useEffect, useState } from \"react\";
import { motion } from \"framer-motion\";
import Navbar from \"@/components/Navbar\";
import StatCard from \"@/components/StatCard\";
import VillageMap from \"@/components/VillageMap\";
import PredictionPanel from \"@/components/PredictionPanel\";
import PredictionResult from \"@/components/PredictionResult\";
import AlertList from \"@/components/AlertList\";
import WeatherInsights from \"@/components/WeatherInsights\";
import ChatAssistant from \"@/components/ChatAssistant\";
import { api } from \"@/lib/api\";
import { Sprout, CloudRain, Layers, ShieldAlert, Activity } from \"lucide-react\";

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [villages, setVillages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get(\"/analytics/overview\").then((r) => setOverview(r.data));
    api.get(\"/villages\").then((r) => {
      setVillages(r.data);
      if (r.data.length) setSelected(r.data[0]);
    });
  }, []);

  return (
    <div className=\"min-h-screen\">
      <Navbar />
      <main className=\"max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6\">
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
          <span className=\"label-mini\">Mission control</span>
          <h1 className=\"font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1\">Yield intelligence dashboard</h1>
          <p className=\"text-white/55 text-sm mt-1\">Real-time village-level forecasts, risk surfacing and AI guidance.</p>
        </motion.div>

        {/* Stat cards */}
        <div className=\"grid grid-cols-2 lg:grid-cols-5 gap-4\">
          <StatCard testId=\"stat-yield\" label=\"Predicted yield\" value={overview?.predicted_yield ?? 0} decimals={2} suffix=\" t/ha\" accent=\"green\" icon={Sprout} hint=\"Network average\" />
          <StatCard testId=\"stat-rainfall\" label=\"Rainfall\" value={overview?.rainfall ?? 0} decimals={0} suffix=\" mm\" accent=\"cyan\" icon={CloudRain} hint=\"Seasonal mean\" />
          <StatCard testId=\"stat-soil\" label=\"Soil health\" value={overview?.soil_health ?? 0} decimals={0} suffix=\"%\" accent=\"yellow\" icon={Layers} hint=\"NPK composite\" />
          <StatCard testId=\"stat-risk\" label=\"Risk level\" value={overview?.risk_distribution?.high ?? 0} decimals={0} suffix=\" high\" accent=\"red\" icon={ShieldAlert} hint={`${overview?.village_count ?? 0} villages tracked`} />
          <StatCard testId=\"stat-confidence\" label=\"Confidence\" value={overview?.confidence ?? 0} decimals={1} suffix=\"%\" accent=\"green\" icon={Activity} hint=\"Model 95% CI avg\" />
        </div>

        {/* Map + Prediction */}
        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
          <div className=\"lg:col-span-2 space-y-6\">
            <VillageMap villages={villages} onSelect={setSelected} selectedId={selected?.id} />
            <WeatherInsights villageId={selected?.id} />
          </div>
          <div className=\"space-y-6\">
            <PredictionPanel onResult={setResult} prefill={selected ? {
              rainfall: selected.avg_rainfall, temperature: selected.avg_temp,
              soil_n: selected.soil_n, soil_p: selected.soil_p, soil_k: selected.soil_k,
              water_index: selected.water_index, seed_quality: selected.seed_quality,
              pest_intensity: selected.pest_intensity, crop: selected.crop, village_id: selected.id,
            } : null} />
            <AlertList />
          </div>
        </div>

        {/* Result */}
        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
          <div className=\"lg:col-span-3\">
            <PredictionResult result={result} />
          </div>
        </div>
      </main>
      <ChatAssistant />
    </div>
  );
}
"