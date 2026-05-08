"import { useEffect, useState } from \"react\";
import Navbar from \"@/components/Navbar\";
import { api } from \"@/lib/api\";
import { Sprout, CloudRain, Bug, Droplets, Sparkles, Loader2 } from \"lucide-react\";
import { motion } from \"framer-motion\";
import { toast } from \"sonner\";
import ChatAssistant from \"@/components/ChatAssistant\";

export default function Farmer() {
  const [villages, setVillages] = useState([]);
  const [village, setVillage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(\"/villages\").then((r) => { setVillages(r.data); setVillage(r.data[0]); });
  }, []);

  const predict = async () => {
    if (!village) return;
    setLoading(true);
    try {
      const { data } = await api.post(\"/predict\", {
        rainfall: village.avg_rainfall, temperature: village.avg_temp,
        soil_n: village.soil_n, soil_p: village.soil_p, soil_k: village.soil_k,
        water_index: village.water_index, seed_quality: village.seed_quality,
        pest_intensity: village.pest_intensity, crop: village.crop, village_id: village.id,
      });
      setResult(data);
    } catch (e) { toast.error(\"Could not predict yield\"); }
    finally { setLoading(false); }
  };

  const riskColor = result?.risk === \"low\" ? \"text-neon-green\" : result?.risk === \"moderate\" ? \"text-neon-yellow\" : \"text-danger\";

  return (
    <div className=\"min-h-screen\">
      <Navbar />
      <main className=\"max-w-3xl mx-auto px-4 py-8 space-y-6\">
        <div>
          <span className=\"label-mini\">Farmer mode</span>
          <h1 className=\"font-display text-3xl sm:text-4xl font-bold mt-1\">My harvest, today.</h1>
          <p className=\"text-white/60 text-sm mt-1\">Pick your village. Tap predict. Get clear next steps.</p>
        </div>

        <div className=\"glass p-5\">
          <label className=\"label-mini block mb-2\">Choose your village</label>
          <select className=\"input-field text-lg py-4\"
            value={village?.id || \"\"}
            onChange={(e) => setVillage(villages.find((v) => v.id === e.target.value))}
            data-testid=\"farmer-village\">
            {villages.map((v) => (
              <option key={v.id} value={v.id} className=\"bg-bg-2\">{v.name} · {v.crop}</option>
            ))}
          </select>
          <button className=\"btn-primary w-full mt-4 text-lg py-4\" onClick={predict} disabled={loading} data-testid=\"farmer-predict\">
            {loading ? <Loader2 className=\"w-5 h-5 animate-spin\" /> : <Sparkles className=\"w-5 h-5\" />}
            {loading ? \"Calculating…\" : \"Predict my harvest\"}
          </button>
        </div>

        {village && (
          <div className=\"grid grid-cols-2 gap-3\">
            <div className=\"glass p-4\"><div className=\"label-mini\">Rainfall</div><div className=\"text-2xl font-display font-bold mt-1 flex items-center gap-2\"><CloudRain className=\"w-5 h-5 text-neon-cyan\" />{village.avg_rainfall} mm</div></div>
            <div className=\"glass p-4\"><div className=\"label-mini\">Water</div><div className=\"text-2xl font-display font-bold mt-1 flex items-center gap-2\"><Droplets className=\"w-5 h-5 text-neon-cyan\" />{village.water_index}/100</div></div>
            <div className=\"glass p-4\"><div className=\"label-mini\">Pest pressure</div><div className=\"text-2xl font-display font-bold mt-1 flex items-center gap-2\"><Bug className=\"w-5 h-5 text-neon-yellow\" />{village.pest_intensity}/100</div></div>
            <div className=\"glass p-4\"><div className=\"label-mini\">Crop</div><div className=\"text-2xl font-display font-bold mt-1 flex items-center gap-2 capitalize\"><Sprout className=\"w-5 h-5 text-neon-green\" />{village.crop}</div></div>
          </div>
        )}

        {result && (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className=\"glass-strong p-6\" data-testid=\"farmer-result\">
            <div className=\"flex items-baseline justify-between gap-3 flex-wrap\">
              <div>
                <div className=\"label-mini\">Your forecast</div>
                <div className=\"font-display text-5xl font-black mt-1\">{result.yield_tons_per_ha}<span className=\"text-white/40 text-2xl ml-1\">t/ha</span></div>
                <div className=\"text-sm text-white/60 mt-1\">Range {result.lower_bound} – {result.upper_bound} t/ha · {result.confidence}% confident</div>
              </div>
              <div className={`text-2xl font-display font-bold capitalize ${riskColor}`}>{result.risk} risk</div>
            </div>
            <p className=\"mt-4 text-white/80\">{result.explanation}</p>
            <div className=\"mt-5\">
              <div className=\"label-mini mb-2\">What you should do</div>
              <ul className=\"space-y-2\">
                {result.recommendations.map((r, i) => (
                  <li key={i} className=\"flex items-start gap-2.5 text-base\">
                    <span className=\"mt-2 w-2 h-2 rounded-full bg-neon-green shrink-0\" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </main>
      <ChatAssistant />
    </div>
  );
}
"