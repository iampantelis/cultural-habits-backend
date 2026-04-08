import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login'; // Χρησιμοποιεί το αρχείο που ήδη έφτιαξες

// Προσωρινά placeholders για τις άλλες σελίδες
const Home = () => <div className="p-8 text-2xl font-bold uppercase tracking-tighter">Trending Feed Coming Soon...</div>;
const Explore = () => <div className="p-8 text-2xl font-bold uppercase tracking-tighter">Search Movies, Music & Books</div>;
const Vault = () => <div className="p-8 text-2xl font-bold uppercase tracking-tighter">Your Personal Cultural Identity</div>;

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brutal-bg font-brutal text-black flex flex-col">

        {/* Το Navbar που "δένει" την αισθητική Neo-Brutalism */}
        <nav className="border-b-4 border-black bg-brutal-secondary p-4 flex justify-between items-center shadow-brutal z-10 relative">
          <Link to="/" className="text-3xl font-black uppercase tracking-tighter hover:underline">
            Cult/Vault
          </Link>
          <div className="flex gap-6 font-bold text-lg uppercase">
            <Link to="/explore" className="hover:bg-black hover:text-white px-2 py-1 transition-colors border-2 border-transparent hover:border-black">Explore</Link>
            <Link to="/vault" className="hover:bg-black hover:text-white px-2 py-1 transition-colors border-2 border-transparent hover:border-black">My Vault</Link>
            <Link to="/login" className="bg-brutal-primary px-4 py-1 text-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              Login
            </Link>
          </div>
        </nav>

        {/* Εδώ φορτώνουν οι σελίδες */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/vault" element={<Vault />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;