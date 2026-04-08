import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import Explore from './pages/Explore';
import Home from './pages/Home'; // Τώρα που το έφτιαξες, θα δουλέψει!

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brutal-bg font-brutal text-black flex flex-col">
        {/* Navbar με το κουμπί Explore */}
        <nav className="border-b-4 border-black bg-brutal-secondary p-4 flex justify-between items-center shadow-brutal z-10 relative">
          <Link to="/" className="text-3xl font-black uppercase tracking-tighter hover:underline">
            Cult/Vault
          </Link>
          <div className="flex gap-6 font-bold text-lg uppercase items-center">
            {/* Link για την εξερεύνηση */}
            <Link to="/explore" className="hover:bg-black hover:text-white px-2 py-1 transition-colors border-2 border-transparent hover:border-black">
              Explore
            </Link>

            <Link to="/login" className="bg-brutal-primary px-4 py-1 text-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              Login
            </Link>
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