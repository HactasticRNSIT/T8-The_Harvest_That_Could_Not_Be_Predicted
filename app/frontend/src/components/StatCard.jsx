"import { motion, useMotionValue, useTransform, animate } from \"framer-motion\";
import { useEffect } from \"react\";

export function AnimatedNumber({ value, decimals = 0, suffix = \"\" }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => v.toFixed(decimals));
  useEffect(() => {
    const controls = animate(mv, value || 0, { duration: 1.2, ease: \"easeOut\" });
    return controls.stop;
  }, [value, mv]);
  return <motion.span>{rounded}{suffix}</motion.span>;
}

export default function StatCard({ label, value, suffix = \"\", decimals = 0, accent = \"green\", hint, icon: Icon, testId }) {
  const accentMap = {
    green: \"from-neon-green/30 to-neon-green/0 text-neon-green\",
    cyan: \"from-neon-cyan/30 to-neon-cyan/0 text-neon-cyan\",
    yellow: \"from-neon-yellow/30 to-neon-yellow/0 text-neon-yellow\",
    red: \"from-danger/30 to-danger/0 text-danger\",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: \"easeOut\" }}
      className=\"glass p-5 relative overflow-hidden hover:-translate-y-0.5 transition-transform\"
      data-testid={testId}
    >
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-radial bg-gradient-to-br ${accentMap[accent].split(\" \").slice(0,2).join(\" \")} opacity-50 blur-2xl`} />
      <div className=\"flex items-center justify-between\">
        <span className=\"label-mini\">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${accentMap[accent].split(\" \")[2]}`} />}
      </div>
      <div className=\"mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight\">
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </div>
      {hint && <div className=\"mt-1 text-xs text-white/55\">{hint}</div>}
    </motion.div>
  );
}
"