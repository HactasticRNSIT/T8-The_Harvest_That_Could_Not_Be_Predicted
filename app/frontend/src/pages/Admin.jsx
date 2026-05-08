"import { useEffect, useState } from \"react\";
import Navbar from \"@/components/Navbar\";
import { api } from \"@/lib/api\";
import { Users, Activity } from \"lucide-react\";
import ChatAssistant from \"@/components/ChatAssistant\";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    api.get(\"/admin/users\").then((r) => setUsers(r.data));
    api.get(\"/admin/predictions\").then((r) => setPredictions(r.data));
  }, []);

  return (
    <div className=\"min-h-screen\">
      <Navbar />
      <main className=\"max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6\">
        <div>
          <span className=\"label-mini\">Admin console</span>
          <h1 className=\"font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1\">Platform operations</h1>
        </div>

        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
          <div className=\"glass p-6\" data-testid=\"admin-users\">
            <h3 className=\"font-display font-bold mb-4 flex items-center gap-2\"><Users className=\"w-4 h-4 text-neon-green\" />Users · {users.length}</h3>
            <div className=\"space-y-2 max-h-[420px] overflow-y-auto pr-1\">
              {users.map((u) => (
                <div key={u.id} className=\"flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 bg-white/[0.02]\">
                  <div className=\"min-w-0\">
                    <div className=\"text-sm font-semibold truncate\">{u.name}</div>
                    <div className=\"text-xs text-white/55 truncate\">{u.email}</div>
                  </div>
                  <span className=\"px-2.5 py-1 rounded-full text-[10px] font-bold bg-neon-green/10 text-neon-green border border-neon-green/30 capitalize\">{u.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div className=\"glass p-6\" data-testid=\"admin-predictions\">
            <h3 className=\"font-display font-bold mb-4 flex items-center gap-2\"><Activity className=\"w-4 h-4 text-neon-cyan\" />Recent predictions · {predictions.length}</h3>
            <div className=\"space-y-2 max-h-[420px] overflow-y-auto pr-1\">
              {predictions.length === 0 && <div className=\"text-white/45 text-sm\">No predictions yet.</div>}
              {predictions.map((p) => (
                <div key={p.id} className=\"rounded-xl border border-white/10 px-3 py-2.5 bg-white/[0.02]\">
                  <div className=\"flex items-center justify-between text-sm\">
                    <span className=\"font-mono text-neon-green\">{p.yield_tons_per_ha} t/ha</span>
                    <span className=\"text-xs capitalize text-white/60\">{p.risk} · {p.confidence}%</span>
                  </div>
                  <div className=\"text-[10px] text-white/40 mt-1 font-mono\">{new Date(p.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <ChatAssistant />
    </div>
  );
}
"