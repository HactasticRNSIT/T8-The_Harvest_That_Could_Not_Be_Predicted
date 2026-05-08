"import { Link, NavLink, useNavigate } from \"react-router-dom\";
import { useAuth } from \"@/contexts/AuthContext\";
import { LogOut, Sprout, LayoutDashboard, BarChart3, User2, Shield } from \"lucide-react\";

const linkBase = \"px-3 py-1.5 rounded-lg text-sm transition-colors\";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className=\"sticky top-0 z-40 bg-[#0A0A0F]/70 backdrop-blur-xl border-b border-white/10\" data-testid=\"navbar\">
      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4\">
        <Link to=\"/\" className=\"flex items-center gap-2 group\" data-testid=\"nav-logo\">
          <span className=\"w-8 h-8 rounded-lg bg-gradient-to-br from-neon-green to-neon-cyan flex items-center justify-center text-bg-1 shadow-[0_0_18px_rgba(0,255,136,0.45)]\">
            <Sprout className=\"w-4 h-4\" strokeWidth={2.5} />
          </span>
          <span className=\"font-display font-extrabold tracking-tight text-lg\">
            Agri<span className=\"text-neon-green\">Sense</span>
          </span>
        </Link>

        <nav className=\"hidden md:flex items-center gap-1\">
          {user ? (
            <>
              <NavLink to=\"/dashboard\" data-testid=\"nav-dashboard\"
                className={({isActive}) => `${linkBase} ${isActive ? \"text-neon-green bg-white/5\" : \"text-white/70 hover:text-white\"}`}>
                <span className=\"inline-flex items-center gap-1.5\"><LayoutDashboard className=\"w-4 h-4\" />Dashboard</span>
              </NavLink>
              <NavLink to=\"/farmer\" data-testid=\"nav-farmer\"
                className={({isActive}) => `${linkBase} ${isActive ? \"text-neon-green bg-white/5\" : \"text-white/70 hover:text-white\"}`}>
                <span className=\"inline-flex items-center gap-1.5\"><User2 className=\"w-4 h-4\" />Farmer</span>
              </NavLink>
              <NavLink to=\"/analytics\" data-testid=\"nav-analytics\"
                className={({isActive}) => `${linkBase} ${isActive ? \"text-neon-green bg-white/5\" : \"text-white/70 hover:text-white\"}`}>
                <span className=\"inline-flex items-center gap-1.5\"><BarChart3 className=\"w-4 h-4\" />Analytics</span>
              </NavLink>
              {user.role === \"admin\" && (
                <NavLink to=\"/admin\" data-testid=\"nav-admin\"
                  className={({isActive}) => `${linkBase} ${isActive ? \"text-neon-green bg-white/5\" : \"text-white/70 hover:text-white\"}`}>
                  <span className=\"inline-flex items-center gap-1.5\"><Shield className=\"w-4 h-4\" />Admin</span>
                </NavLink>
              )}
            </>
          ) : (
            <>
              <a href=\"#features\" className={`${linkBase} text-white/70 hover:text-white`}>Features</a>
              <a href=\"#impact\" className={`${linkBase} text-white/70 hover:text-white`}>Impact</a>
            </>
          )}
        </nav>

        <div className=\"flex items-center gap-2\">
          {user ? (
            <>
              <div className=\"hidden sm:flex items-center gap-2 text-xs\">
                <span className=\"px-2.5 py-1 rounded-full bg-white/5 border border-white/10 capitalize\" data-testid=\"nav-role\">{user.role}</span>
                <span className=\"text-white/70\">{user.name}</span>
              </div>
              <button onClick={() => { logout(); nav(\"/\"); }} className=\"btn-ghost !px-3 !py-2\" data-testid=\"logout-btn\" aria-label=\"Logout\">
                <LogOut className=\"w-4 h-4\" />
              </button>
            </>
          ) : (
            <>
              <Link to=\"/login\" className=\"btn-ghost !px-4 !py-2 text-sm\" data-testid=\"nav-login\">Sign in</Link>
              <Link to=\"/signup\" className=\"btn-primary !px-4 !py-2 text-sm\" data-testid=\"nav-signup\">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
"