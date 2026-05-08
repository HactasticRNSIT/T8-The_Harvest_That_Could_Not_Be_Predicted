"import \"@/App.css\";
import { BrowserRouter, Routes, Route } from \"react-router-dom\";
import { AuthProvider } from \"@/contexts/AuthContext\";
import { Toaster } from \"sonner\";
import Landing from \"@/pages/Landing\";
import Login from \"@/pages/Login\";
import Signup from \"@/pages/Signup\";
import Dashboard from \"@/pages/Dashboard\";
import Farmer from \"@/pages/Farmer\";
import Analytics from \"@/pages/Analytics\";
import Admin from \"@/pages/Admin\";
import ProtectedRoute from \"@/components/ProtectedRoute\";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const helloWorldApi = async () => {
    try {
      const response = await axios.get(`${API}/`);
      console.log(response.data.message);
    } catch (e) {
      console.error(e, `errored out requesting / api`);
    }
  };

  useEffect(() => {
    helloWorldApi();
  }, []);

  return (
    <div>
      <header className="App-header">
        <a
          className="App-link"
          href="https://emergent.sh"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="https://avatars.githubusercontent.com/in/1201222?s=120&u=2686cf91179bbafbc7a71bfbc43004cf9ae1acea&v=4" />
        </a>
        <p className="mt-5">Building something incredible ~!</p>
      </header>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}


export default function App() {
  return (
    <div className=\"App\">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path=\"/\" element={<Landing />} />
            <Route path=\"/login\" element={<Login />} />
            <Route path=\"/signup\" element={<Signup />} />
            <Route path=\"/dashboard\" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path=\"/farmer\" element={<ProtectedRoute><Farmer /></ProtectedRoute>} />
            <Route path=\"/analytics\" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path=\"/admin\" element={<ProtectedRoute roles={[\"admin\"]}><Admin /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
        <Toaster position=\"top-right\" theme=\"dark\" toastOptions={{
          style: { background: \"#14141E\", border: \"1px solid rgba(255,255,255,0.1)\", color: \"#fff\" }
        }} />
      </AuthProvider>
    </div>
  );
}

