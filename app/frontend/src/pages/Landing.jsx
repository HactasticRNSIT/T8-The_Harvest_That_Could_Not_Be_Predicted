"import { Link } from \"react-router-dom\";
import { motion } from \"framer-motion\";
import { Sprout, Activity, Map, Satellite, Brain, ShieldCheck, ArrowRight, Sparkles } from \"lucide-react\";
import Navbar from \"@/components/Navbar\";

const FEATURES = [
  { icon: Brain, title: \"Village-level forecasting\", text: \"Hyper-local yield predictions calibrated by microclimate, soil, water and seed quality.\" },
  { icon: ShieldCheck, title: \"Quantified uncertainty\", text: \"Every forecast ships with a 95% confidence interval and risk classification.\" },
  { icon: Map, title: \"Risk zone heatmaps\", text: \"Glanceable green / yellow / red zones across districts on an interactive map.\" },
  { icon: Satellite, title: \"Satellite + NDVI\", text: \"Vegetation indices and weather signals fused into the prediction pipeline.\" },
  { icon: Activity, title: \"Explainable AI\", text: \"See exactly which inputs lifted or limited yield — for every village, every cycle.\" },
  { icon: Sparkles, title: \"Field-ready guidance\", text: \"Tailored irrigation, nutrient and pest actions surfaced in plain language.\" },
];

const STATS = [
  { v: \"15\", l: \"Villages mapped\" },
  { v: \"92%\", l: \"Avg model confidence\" },
  { v: \"8\", l: \"Live alert categories\" },
  { v: \"<300ms\", l: \"Prediction latency\" },
];

export default function Landing() {
  return (
    <div className=\"min-h-screen\">
      <Navbar />

      {/* Hero */}
      <section className=\"relative overflow-hidden\">
        <div className=\"absolute inset-0 grid-bg opacity-50\" />
        <div className=\"absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(0,255,136,0.18),transparent)]\" />
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 lg:pt-28 lg:pb-32 relative\">
          <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.7}} className=\"max-w-3xl\">
            <span className=\"inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neon-green/10 border border-neon-green/30 text-neon-green\">
              <span className=\"w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse\" /> LIVE · v2.6 model
            </span>
            <h1 className=\"font-display text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05] mt-5\">
              Predicting tomorrow's <br/>
              <span className=\"bg-clip-text text-transparent bg-gradient-to-r from-neon-green via-neon-cyan to-neon-yellow\">harvest</span> with AI intelligence.
            </h1>
            <p className=\"mt-6 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed\">
              AgriSense fuses climate, soil, satellite and field signals into village-level crop yield
              forecasts — with quantified uncertainty, risk zones, and recommendations field officers can act on today.
            </p>
            <div className=\"mt-8 flex flex-wrap gap-3\">
              <Link to=\"/signup\" className=\"btn-primary\" data-testid=\"hero-cta-primary\">
                Predict harvest <ArrowRight className=\"w-4 h-4\" />
              </Link>
              <Link to=\"/login\" className=\"btn-ghost\" data-testid=\"hero-cta-secondary\">Sign in to dashboard</Link>
            </div>
          </motion.div>

          <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.7,delay:0.2}}
            className=\"mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3\">
            {STATS.map((s) => (
              <div key={s.l} className=\"glass p-4\">
                <div className=\"font-display text-2xl sm:text-3xl font-extrabold text-neon-green\">{s.v}</div>
                <div className=\"text-xs text-white/55 mt-1\">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id=\"features\" className=\"max-w-7xl mx-auto px-4 sm:px-6 py-20\">
        <div className=\"max-w-2xl\">
          <span className=\"label-mini\">Capabilities</span>
          <h2 className=\"font-display text-3xl sm:text-4xl font-bold tracking-tight mt-2\">An operating system for agricultural intelligence.</h2>
          <p className=\"text-white/60 mt-3\">Built for farmers, field officers, government analysts and policymakers operating under time pressure.</p>
        </div>
        <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10\">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.45,delay:i*0.05}}
              className=\"glass p-6 hover:-translate-y-1 transition-transform\">
              <div className=\"w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center mb-4\">
                <f.icon className=\"w-5 h-5 text-neon-green\" />
              </div>
              <h3 className=\"font-display font-bold text-lg\">{f.title}</h3>
              <p className=\"text-sm text-white/65 mt-2 leading-relaxed\">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Impact strip */}
      <section id=\"impact\" className=\"max-w-7xl mx-auto px-4 sm:px-6 py-20\">
        <div className=\"glass-strong p-8 sm:p-12 relative overflow-hidden\">
          <div className=\"absolute -right-20 -top-20 w-72 h-72 rounded-full bg-neon-cyan/15 blur-3xl\" />
          <div className=\"absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-neon-green/15 blur-3xl\" />
          <div className=\"relative max-w-3xl\">
            <span className=\"label-mini\">For policymakers</span>
            <h3 className=\"font-display text-2xl sm:text-3xl font-bold mt-2\">From district averages to village-level truth.</h3>
            <p className=\"text-white/65 mt-3\">
              Aggregate models obscure the variation that drives real outcomes. AgriSense surfaces which villages
              will outperform, which need intervention, and which are flagged with low forecast confidence — so
              procurement, storage and relief can be allocated with precision.
            </p>
            <div className=\"mt-6 flex flex-wrap gap-3\">
              <Link to=\"/signup\" className=\"btn-primary\" data-testid=\"impact-cta\">Start a free pilot</Link>
              <Link to=\"/login\" className=\"btn-ghost\">Demo logins</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className=\"border-t border-white/5 mt-10\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-white/50\">
          <div className=\"flex items-center gap-2\">
            <Sprout className=\"w-4 h-4 text-neon-green\" />
            <span>AgriSense AI · The future operating system of agriculture.</span>
          </div>
          <div className=\"font-mono text-xs\">© {new Date().getFullYear()} AgriSense Labs</div>
        </div>
      </footer>
    </div>
  );
}
"