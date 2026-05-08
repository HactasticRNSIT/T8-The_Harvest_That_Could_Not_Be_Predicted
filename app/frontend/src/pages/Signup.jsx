"import { useState } from \"react\";
import { Link, useNavigate } from \"react-router-dom\";
import { useAuth } from \"@/contexts/AuthContext\";
import { Sprout, Loader2 } from \"lucide-react\";
import { toast } from \"sonner\";

const ROLES = [
  { v: \"farmer\", l: \"Farmer\" },
  { v: \"officer\", l: \"Agricultural Officer\" },
  { v: \"analyst\", l: \"Government Analyst\" },
];

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: \"\", email: \"\", password: \"\", role: \"farmer\" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await signup(form);
      toast.success(`Welcome, ${u.name}`);
      nav(u.role === \"farmer\" ? \"/farmer\" : \"/dashboard\");
    } catch (err) {
      toast.error(err?.response?.data?.detail || \"Signup failed\");
    } finally { setLoading(false); }
  };

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
          <h1 className=\"font-display text-2xl font-bold\">Create account</h1>
          <p className=\"text-sm text-white/55 mt-1\">Join the harvest intelligence network.</p>
          <form onSubmit={submit} className=\"mt-6 space-y-3\">
            <div>
              <label className=\"label-mini block mb-1.5\">Full name</label>
              <input required value={form.name} onChange={(e)=>set(\"name\",e.target.value)} className=\"input-field\" data-testid=\"signup-name\" />
            </div>
            <div>
              <label className=\"label-mini block mb-1.5\">Email</label>
              <input type=\"email\" required value={form.email} onChange={(e)=>set(\"email\",e.target.value)} className=\"input-field\" data-testid=\"signup-email\" />
            </div>
            <div>
              <label className=\"label-mini block mb-1.5\">Password</label>
              <input type=\"password\" required minLength={6} value={form.password} onChange={(e)=>set(\"password\",e.target.value)} className=\"input-field\" data-testid=\"signup-password\" />
            </div>
            <div>
              <label className=\"label-mini block mb-1.5\">Role</label>
              <div className=\"grid grid-cols-3 gap-2\">
                {ROLES.map((r) => (
                  <button type=\"button\" key={r.v} onClick={() => set(\"role\", r.v)}
                    className={`text-xs px-2 py-2 rounded-lg border transition ${form.role===r.v ? \"bg-neon-green/10 border-neon-green/40 text-neon-green\" : \"bg-white/5 border-white/10 text-white/70\"}`}
                    data-testid={`role-${r.v}`}>
                    {r.l}
                  </button>
                ))}
              </div>
            </div>
            <button type=\"submit\" disabled={loading} className=\"btn-primary w-full\" data-testid=\"signup-submit\">
              {loading ? <Loader2 className=\"w-4 h-4 animate-spin\" /> : null} Create account
            </button>
          </form>
          <div className=\"text-sm text-white/55 mt-6\">
            Already have an account? <Link to=\"/login\" className=\"text-neon-green hover:underline\" data-testid=\"link-login\">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
"