import { useState } from "react";
import { db } from "../services/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Search, MapPin, Heart } from "lucide-react";
import { addToWishlist } from "../lib/wishlistHelpers";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function GlobalSearch() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { user } = useAuth();
  
  // We need store mapping to display store info for products
  const [storeCache, setStoreCache] = useState({});

  const performSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    
    try {
      // In a real prod app with Algolia or similar this is easier,
      // but here we just fetch all or index properly.
      const q = query(collection(db, "products"));
      const snap = await getDocs(q);
      
      const found = [];
      const neededStores = new Set();
      
      snap.forEach(doc => {
        const data = doc.data();
        if (data.name.toLowerCase().includes(search.toLowerCase()) || 
            (data.category && data.category.toLowerCase().includes(search.toLowerCase()))) {
          found.push({ id: doc.id, ...data });
          neededStores.add(data.storeId);
        }
      });

      // Fetch missing store details
      const newCache = { ...storeCache };
      for (let sId of neededStores) {
        if (!newCache[sId]) {
          const storeQ = query(collection(db, "stores"), "where", "ownerId", "==", sId); // ownerId is storeId in our setup
          const sSnap = await getDocs(query(collection(db, "stores")));
          sSnap.forEach(sDoc => {
             if (sDoc.id === sId) newCache[sId] = sDoc.data();
          });
        }
      }
      setStoreCache(newCache);
      setResults(found);
    } catch(err) {
      toast.error("Failed to search products");
    } finally {
      setLoading(false);
    }
  };

  const handleWishlistAdd = async (product) => {
    try {
      await addToWishlist(product, user);
      toast.success("Added to wishlist!");
    } catch (e) {
      toast.error("Failed to add to wishlist.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <form onSubmit={performSearch} className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <input 
          type="text"
          className="w-full p-4 pl-12 md:pl-14 pr-24 md:pr-32 text-base md:text-lg border-2 border-border rounded-full bg-background/50 backdrop-blur-sm focus:bg-background focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
          placeholder="Search products nearby..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={loading}
          className="absolute right-2 top-2 bottom-2 bg-primary text-primary-foreground px-4 md:px-6 rounded-full font-bold shadow-md hover:shadow-lg hover:-translate-y-px transition-all disabled:opacity-50 text-sm md:text-base"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {hasSearched && (
        <div className="mt-8 bg-card border border-border rounded-3xl p-6 shadow-sm min-h-64">
           <h3 className="text-xl font-bold mb-6">Search Results for "{search}"</h3>
           
           {loading ? (
             <div className="text-center py-12 text-muted-foreground animate-pulse">Searching the hyper-local grid...</div>
           ) : results.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">No products found matching your search.</div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {results.map(p => {
                 const store = storeCache[p.storeId] || {};
                 return (
                   <div key={p.id} className="border border-border rounded-xl p-4 flex gap-4 hover:shadow-md transition-shadow bg-background relative overflow-hidden group">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">{p.category || 'General'}</div>
                        <h4 className="font-bold text-lg leading-tight mb-1">{p.name}</h4>
                        <div className="text-2xl font-black font-mono">₹{p.price.toFixed(2)}</div>
                        
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                           <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin size={12} /> {store.name || 'Loading Store...'}
                           </div>
                           {store.username && (
                             <Link to={`/stores/${store.username}`} className="text-xs text-primary font-medium hover:underline">
                               Visit Store &rarr;
                             </Link>
                           )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end justify-between">
                         {p.stock > 0 ? (
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-sm">In Stock</span>
                          ) : (
                            <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-sm">Out of Stock</span>
                          )}
                          <button 
                            onClick={() => handleWishlistAdd(p)}
                            className="p-2 bg-muted hover:bg-primary/10 hover:text-primary rounded-full transition-colors mt-auto"
                            title="Add to Wishlist"
                          >
                            <Heart size={18} />
                          </button>
                      </div>
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      )}
    </div>
  );
}
