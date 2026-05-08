"import { useEffect, useState } from \"react\";
import { api } from \"@/lib/api\";
import { AlertTriangle, Bug, Droplets, CloudRain, Snowflake, ShieldAlert } from \"lucide-react\";

const ICONS = { drought: Droplets, pest: Bug, flood: CloudRain, low_confidence: ShieldAlert, water_shortage: Droplets, frost: Snowflake };
const SEV = {
  info: \"border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan\",
  warning: \"border-neon-yellow/30 bg-neon-yellow/5 text-neon-yellow\",
  critical: \"border-danger/40 bg-danger/5 text-danger\",
};

export default function AlertList() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => { api.get(\"/alerts\").then((r) => setAlerts(r.data)); }, []);
  return (
    <div className=\"glass p-6\" data-testid=\"alert-list\">
      <div className=\"flex items-center justify-between mb-4\">
        <h3 className=\"font-display font-bold flex items-center gap-2\"><AlertTriangle className=\"w-4 h-4 text-neon-yellow\" />Live alerts</h3>
        <span className=\"label-mini\">{alerts.length} active</span>
      </div>
      <div className=\"space-y-2.5 max-h-[420px] overflow-y-auto pr-1\">
        {alerts.map((a) => {
          const Icon = ICONS[a.category] || AlertTriangle;
          return (
            <div key={a.id} className={`rounded-xl border px-3.5 py-3 ${SEV[a.severity]}`} data-testid={`alert-${a.id}`}>
              <div className=\"flex items-start gap-2.5\">
                <Icon className=\"w-4 h-4 mt-0.5 shrink-0\" />
                <div className=\"min-w-0\">
                  <div className=\"text-sm font-semibold text-white\">{a.title}</div>
                  <div className=\"text-xs text-white/70 mt-0.5\">{a.message}</div>
                  <div className=\"text-[10px] text-white/40 mt-1.5 font-mono\">
                    {a.village_name} · {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {alerts.length === 0 && <div className=\"text-white/40 text-sm\">No alerts.</div>}
      </div>
    </div>
  );
}
"