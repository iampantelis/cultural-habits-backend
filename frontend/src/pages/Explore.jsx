import React, { useState } from 'react';
import api from '../api';

function Explore() {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('movies');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await api.get(`/search/${mediaType}?query=${query}`);
      setResults(response.data);
    } catch (error) {
      alert("Σφάλμα κατά την αναζήτηση.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogInteraction = async (item, rating) => {
    try {
      await api.post('/interactions/log', {
        external_id: item.external_id,
        source: item.source,
        media_type: item.type,
        title: item.title,
        poster_url: item.thumbnail,
        year: item.year,
        description: item.description,
        rating: parseFloat(rating),
        status: "completed"
      });
      alert(`Προστέθηκε στο Vault: ${item.title} με ${rating} αστέρια!`);
    } catch (error) {
      alert("Σφάλμα κατά την αποθήκευση.");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto text-black">
      <h1 className="text-5xl font-black uppercase mb-8 tracking-tighter">Explore Culture</h1>

      {/* Search Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-12">
        <input
          type="text"
          placeholder={`SEARCH FOR ${mediaType.toUpperCase()}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border-4 border-black p-4 text-xl font-bold outline-none focus:bg-yellow-100 shadow-brutal"
        />

        <div className="flex gap-2">
          {['movies', 'music', 'books'].map((type) => (
            <button
              key={type}
              onClick={() => setMediaType(type)}
              className={`border-4 border-black px-4 py-2 font-black uppercase transition-all shadow-brutal-hover ${mediaType === type ? 'bg-brutal-secondary translate-x-[2px] translate-y-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <button
          onClick={handleSearch}
          className="bg-brutal-primary border-4 border-black px-8 py-4 text-xl font-black uppercase text-white shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-hover active:shadow-none"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {results.map((item, index) => (
          <div key={index} className="border-4 border-black bg-white shadow-brutal flex flex-col overflow-hidden">
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-64 object-cover border-b-4 border-black"
              />
            )}

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black uppercase mb-2 leading-tight">{item.title}</h3>
                <span className="inline-block bg-black text-white px-2 py-1 text-xs font-bold uppercase mb-4">
                  {item.type}
                </span>
                <p className="text-sm font-medium line-clamp-2 mb-4">{item.description}</p>
              </div>

              <div className="mt-4 border-t-2 border-black pt-4">
                <p className="font-bold text-xs mb-2 uppercase tracking-widest text-black">Rate (0.5 - 5):</p>
                <div className="flex flex-col gap-3">
                  <input
                    type="range" min="0.5" max="5" step="0.5"
                    defaultValue="4"
                    id={`rating-${item.external_id}`}
                    className="w-full h-4 bg-gray-200 border-2 border-black appearance-none cursor-pointer accent-brutal-primary"
                  />
                  <button
                    onClick={() => {
                      const val = document.getElementById(`rating-${item.external_id}`).value;
                      handleLogInteraction(item, val);
                    }}
                    className="border-2 border-black bg-brutal-secondary font-black uppercase py-2 text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
                  >
                    Submit Rating
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Explore;