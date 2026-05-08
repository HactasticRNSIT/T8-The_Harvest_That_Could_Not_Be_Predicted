"import { useState } from \"react\";
import { motion } from \"framer-motion\";
import { api } from \"@/lib/api\";
import { Sparkles, Loader2 } from \"lucide-react\";
import { toast } from \"sonner\";

const FIELDS = [
  { key: \"rainfall\", label: \"Rainfall (mm)\", min: 0, max: 2000, step: 10 },
  { key: \"temperature\", label: \"Temperature (°C)\", min: 0, max: 50, step: 0.5 },
  { key: \"soil_n\", label: \"Soil Nitrogen (kg/ha)\", min: 0, max: 400, step: 5 },
  { key: \"soil_p\", label: \"Soil Phosphorus (kg/ha)\", min: 0, max: 200, step: 2 },
  { key: \"soil_k\", label: \"Soil Potassium (kg/ha)\", min: 0, max: 400, step: 5 },
  { key: \"water_index\", label: \"Water Availability\", min: 0, max: 100, step: 1 },
  { key: \"seed_quality\", label: \"Seed Quality\", min: 0, max: 100, step: 1 },
  { key: \"pest_intensity\", label: \"Pest Intensity\", min: 0, max: 100, step: 1 },
];

const CROPS = [\"wheat\", \"rice\", \"maize\", \"cotton\", \"sugarcane\", \"soybean\", \"millet\"];

export default function PredictionPanel({ onResult, prefill }) {
  const [form, setForm] = useState({
    rainfall: 800, temperature: 24, soil_n: 220, soil_p: 55, soil_k: 180,
    water_index: 70, seed_quality: 78, pest_intensity: 18, crop: \"wheat\",
    ...(prefill || {}),
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: typeof v === \"string\" ? v : Number(v) }));

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(\"/predict\", form);
      onResult && onResult(data);
      toast.success(`Yield predicted: ${data.yield_tons_per_ha} t/ha`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || \"Prediction failed\");
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}} className=\"glass p-6\" data-testid=\"prediction-panel\">
      <div className=\"flex items-center justify-between mb-5\">
        <div>
          <div className=\"label-mini\">AI Engine</div>
          <h3 className=\"font-display text-xl font-bold mt-1\">Predict harvest</h3>
        </div>
        <span className=\"px-2.5 py-1 rounded-full text-[10px] font-bold bg-neon-green/10 text-neon-green border border-neon-green/30\">v2.6 model</span>
      </div>

      <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-4\">
        <div className=\"sm:col-span-2\">
          <label className=\"label-mini mb-1.5 block\">Crop</label>
          <select className=\"input-field\" value={form.crop} onChange={(e) => set(\"crop\", e.target.value)} data-testid=\"input-crop\">
            {CROPS.map((c) => <option key={c} value={c} className=\"bg-bg-2\">{c}</option>)}
          </select>
        </div>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className=\"flex items-center justify-between mb-1.5\">
              <label className=\"label-mini\">{f.label}</label>
              <span className=\"text-xs font-mono text-neon-green\">{form[f.key]}</span>
            </div>
            <input
              type=\"range\" min={f.min} max={f.max} step={f.step} value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              className=\"w-full accent-[#00FF88]\"
              data-testid={`input-${f.key}`}
            />
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={loading} className=\"btn-primary mt-6 w-full\" data-testid=\"predict-btn\">
        {loading ? <Loader2 className=\"w-4 h-4 animate-spin\" /> : <Sparkles className=\"w-4 h-4\" />}
        {loading ? \"Computing forecast…\" : \"Run prediction\"}
      </button>
    </motion.div>
  );
}
"