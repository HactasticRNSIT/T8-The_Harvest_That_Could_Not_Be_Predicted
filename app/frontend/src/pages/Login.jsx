"import { useState } from \"react\";
import { Link, useNavigate } from \"react-router-dom\";
import { useAuth } from \"@/contexts/AuthContext\";
import { Sprout, Loader2 } from \"lucide-react\";
import { toast } from \"sonner\";

const DEMO = [
  { role: \"Farmer\", email: \"farmer@agrisense.ai\", password: \"Farmer@123\" },
  { role: \"Officer\", email: \"officer@agrisense.ai\", password: \"Officer@123\" },
  { role: \"Analyst\", email: \"analyst@agrisense.ai\", password: \"Analyst@123\" },
  { role: \"Admin\", email: \"admin@agrisense.ai\", password: \"Admin@123\" },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState(\"\");
  const [password, setPassword] = useState(\"\");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      nav(u.role === \"farmer\" ? \"/farmer\" : \"/dashboard\");
    } catch (err) {
      toast.error(err?.response?.data?.detail || \"Login failed\");
    } finally { setLoading(false); }
  };

  const fill = (d) => { setEmail(d.email); setPassword(d.password); };

  return (
    <div className=\"min-h-screen grid-bg flex items-center justify-center px-4 py-10\">
      <div className=\"w-full max-w-md\">
        <Link to=\"/\" className=\"flex items-center gap-2 mb-6 text-white/80 hover:text-white\">
          <span className=\"w-8 h-8 rounded-lg bg-gradient-to-br from-neon-green to-neon-cyan flex items-center justify-center text-bg-1\">
            <Sprout className=\"w-4 h-4\" strokeWidth={2.5} />
          </span>
          <span className=\"font-display font-extrabold tracking-tight\">Agri<span className=\"text-neon-green\">Sense</span></span>
        </Link>
        <div className=\"glass-strong p-7\">
          <h1 className=\"font-display text-2xl font-bold\">Sign in</h1>
          <p className=\"text-sm text-white/55 mt-1\">Access the agriculture intelligence dashboard.</p>
          <form onSubmit={submit} className=\"mt-6 space-y-3\">
            <div>
              <label className=\"label-mini block mb-1.5\">Email</label>
              <input type=\"email\" required value={email} onChange={(e) => setEmail(e.target.value)} className=\"input-field\" data-testid=\"login-email\" />
            </div>
            <div>
              <label className=\"label-mini block mb-1.5\">Password</label>
              <input type=\"password\" required value={password} onChange={(e) => setPassword(e.target.value)} className=\"input-field\" data-testid=\"login-password\" />
            </div>
            <button type=\"submit\" disabled={loading} className=\"btn-primary w-full\" data-testid=\"login-submit\">
              {loading ? <Loader2 className=\"w-4 h-4 animate-spin\" /> : null} Continue
            </button>
          </form>
          <div className=\"mt-6\">
            <div className=\"label-mini mb-2\">Demo accounts</div>
            <div className=\"grid grid-cols-2 gap-2\">
              {DEMO.map((d) => (
                <button key={d.role} onClick={() => fill(d)} className=\"text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-neon-green/40 hover:bg-neon-green/5 transition text-left\" data-testid={`demo-${d.role.toLowerCase()}`}>
                  <div className=\"font-semibold text-white\">{d.role}</div>
                  <div className=\"text-white/50 truncate\">{d.email}</div>
                </button>
              ))}
            </div>
          </div>
          <div className=\"text-sm text-white/55 mt-6\">
            New here? <Link to=\"/signup\" className=\"text-neon-green hover:underline\" data-testid=\"link-signup\">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
"