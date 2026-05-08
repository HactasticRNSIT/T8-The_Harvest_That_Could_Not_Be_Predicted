"import { motion } from \"framer-motion\";
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Lightbulb } from \"lucide-react\";

const RISK_STYLES = {
  low: { label: \"Low risk\", color: \"text-neon-green\", bg: \"bg-neon-green/10 border-neon-green/30\" },
  moderate: { label: \"Moderate\", color: \"text-neon-yellow\", bg: \"bg-neon-yellow/10 border-neon-yellow/30\" },
  high: { label: \"High risk\", color: \"text-danger\", bg: \"bg-danger/10 border-danger/30\" },
};

export default function PredictionResult({ result }) {
  if (!result) {
    return (
      <div className=\"glass p-6 h-full flex items-center justify-center text-white/50 text-sm\" data-testid=\"prediction-empty\">
        Run a prediction to see yield forecast, confidence range, explainability, and tailored recommendations.
      </div>
    );
  }
  const r = RISK_STYLES[result.risk] || RISK_STYLES.moderate;
  const max = Math.max(...result.features.map((f) => Math.abs(f.impact)), 0.01);

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}} className=\"space-y-4\" data-testid=\"prediction-result\">
      <div className=\"glass p-6\">
        <div className=\"flex items-start justify-between flex-wrap gap-3\">
          <div>
            <div className=\"label-mini\">Predicted yield</div>
            <div className=\"font-display text-5xl font-black mt-1\">
              {result.yield_tons_per_ha}<span className=\"text-white/40 text-2xl ml-1\">t/ha</span>
            </div>
            <div className=\"text-xs text-white/55 mt-1 font-mono\">
              95% CI: {result.lower_bound} – {result.upper_bound} t/ha
            </div>
          </div>
          <div className=\"text-right space-y-2\">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${r.bg} ${r.color}`} data-testid=\"risk-badge\">{r.label}</span>
            <div className=\"text-xs text-white/55\">Confidence</div>
            <div className=\"font-mono text-neon-cyan font-bold\">{result.confidence}%</div>
          </div>
        </div>
        <p className=\"mt-4 text-sm text-white/75 leading-relaxed\">{result.explanation}</p>
      </div>

      <div className=\"glass p-6\">
        <div className=\"flex items-center gap-2 mb-3\">
          <ShieldCheck className=\"w-4 h-4 text-neon-cyan\" />
          <h4 className=\"font-display font-bold\">Explainable AI · feature impact</h4>
        </div>
        <div className=\"space-y-2.5\">
          {result.features.map((f) => {
            const pct = (Math.abs(f.impact) / max) * 100;
            const positive = f.direction === \"positive\";
            return (
              <div key={f.name} className=\"grid grid-cols-12 items-center gap-3 text-xs\" data-testid={`feature-${f.name}`}>
                <div className=\"col-span-4 text-white/75 truncate\">{f.name}</div>
                <div className=\"col-span-6 h-2 rounded-full bg-white/5 overflow-hidden\">
                  <div
                    className=\"h-full rounded-full\"
                    style={{
                      width: `${pct}%`,
                      background: positive ? \"linear-gradient(90deg,#00FF88,#00E5FF)\" : \"linear-gradient(90deg,#FF3B30,#F4D03F)\",
                    }}
                  />
                </div>
                <div className={`col-span-2 text-right font-mono ${positive ? \"text-neon-green\" : \"text-danger\"}`}>
                  {positive ? <TrendingUp className=\"inline w-3 h-3 mr-1\" /> : <TrendingDown className=\"inline w-3 h-3 mr-1\" />}
                  {f.impact > 0 ? \"+\" : \"\"}{f.impact}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className=\"glass p-6\">
        <div className=\"flex items-center gap-2 mb-3\">
          <Lightbulb className=\"w-4 h-4 text-neon-yellow\" />
          <h4 className=\"font-display font-bold\">AI recommendations</h4>
        </div>
        <ul className=\"space-y-2\">
          {result.recommendations.map((rec, i) => (
            <li key={i} className=\"text-sm text-white/80 flex items-start gap-2.5\" data-testid={`rec-${i}`}>
              <span className=\"mt-1.5 w-1.5 h-1.5 rounded-full bg-neon-green shrink-0\" />
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
"