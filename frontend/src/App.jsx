import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login'
import Explore from './pages/Explore'

const Home = () => <div className="p-8 text-2xl font-bold uppercase">Trending Feed (Coming Soon)</div>;

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brutal-bg font-brutal text-black flex flex-col">
        <nav className="border-b-4 border-black bg-brutal-secondary p-4 flex justify-between items-center shadow-brutal">
          <Link to="/" className="text-3xl font-black uppercase tracking-tighter">Cult/Vault</Link>
          <div className="flex gap-4 font-bold uppercase">
             <Link to="/login" className="bg-brutal-primary px-4 py-1 text-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none">Login</Link>
          </div>
        </nav>

        <main className="flex-1 text-black">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/explore" element={<Explore />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;