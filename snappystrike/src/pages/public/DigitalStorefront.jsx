import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { Search, MapPin, PackageOpen, LayoutGrid, Heart, Phone, Info } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { addToWishlist } from "../../lib/wishlistHelpers";

export default function DigitalStorefront() {
  const { username } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const fetchStoreAndInventory = async () => {
      try {
        // 1. Resolve username to storeId
        const usernameRef = doc(db, "storeUsernames", username);
        const usernameDoc = await getDoc(usernameRef);
        
        if (!usernameDoc.exists()) {
          toast.error("Store not found");
          setLoading(false);
          return;
        }

        const storeId = usernameDoc.data().storeId;
        
        // 2. Resolve store data
        const storeRef = doc(db, "stores", storeId);
        const storeDoc = await getDoc(storeRef);
        if (storeDoc.exists()) {
          setStore({ id: storeDoc.id, ...storeDoc.data() });
        }

        // 3. Attach real-time listener to inventory for buyers
        const q = query(collection(db, "products"), where("storeId", "==", storeId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const prodList = [];
          snapshot.forEach(d => prodList.push({ id: d.id, ...d.data() }));
          setProducts(prodList);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchStoreAndInventory();
  }, [username]);

  const handleWishlistAdd = async (product) => {
    try {
      await addToWishlist(product, user);
      toast.success("Added to wishlist!");
    } catch (e) {
      toast.error("Failed to add to wishlist.");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading storefront...</div>;
  }

  if (!store) {
    return <div className="min-h-screen flex items-center justify-center">Store not found or unavailable.</div>;
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      {/* Store Header Banner */}
      <div className="bg-primary text-primary-foreground py-12 px-6 shadow-2xl relative overflow-hidden">
        {/* Dynamic Promo Banner */}
        {store.activeOffers && (
           <div className="absolute top-0 left-0 w-full bg-destructive text-destructive-foreground py-2 px-4 shadow-sm text-center text-sm font-black tracking-widest uppercase z-10 animate-in slide-in-from-top flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> {store.activeOffers}
           </div>
        )}

        {/* Global Hub Back Link & Wishlist */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20 flex items-center gap-4">
           <Link to="/" className="text-primary-foreground/80 hover:text-white text-sm font-medium transition-colors">
              ← SnappyStrike Hub
           </Link>
           <Link to="/wishlist" className="flex items-center gap-2 bg-background border px-4 py-2 rounded-full font-bold shadow-sm hover:translate-y-[-2px] transition-transform text-foreground">
             <Heart size={16} className="text-destructive" fill="currentColor" /> Wishlist
           </Link>
        </div>
        
        <div className={`max-w-7xl mx-auto relative z-10 ${store.activeOffers ? 'mt-6' : ''}`}>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-md">
            {store.name || "Local Commerce Shop"}
          </h1>
          <div className="flex flex-wrap gap-4 text-primary-foreground/80 font-medium">
            {store.address && <div className="flex items-center gap-2 bg-black/10 px-4 py-2 rounded-full backdrop-blur-sm"><MapPin size={18}/> {store.address} - {store.pincode}</div>}
            {store.mobileNumber && <div className="flex items-center gap-2 bg-black/10 px-4 py-2 rounded-full backdrop-blur-sm"><Phone size={18}/> {store.mobileNumber}</div>}
            {store.description && <div className="flex items-center gap-2 w-full mt-2"><Info size={18} className="text-primary-foreground/50"/> <span className="text-sm max-w-2xl leading-relaxed text-primary-foreground/90">{store.description}</span></div>}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">Live Inventory <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse ml-2"></span></h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-input rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card border rounded-xl">
              No products available or matching search.
            </div>
          ) : (
            filteredProducts.map(p => (
              <div key={p.id} className="bg-card border border-border p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full z-0 pointer-events-none"></div>
                <div className="z-10 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{p.category || 'General'}</div>
                  <h3 className="font-bold text-lg leading-tight mb-2">{p.name}</h3>
                  <p className="text-2xl font-black text-primary font-mono tracking-tighter">₹{p.price}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-border z-10 flex justify-between items-center flex-wrap gap-2">
                  {p.stock > 0 ? (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-sm">In Stock: {p.stock}</span>
                  ) : (
                    <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-sm">Out of Stock</span>
                  )}
                  <button 
                    onClick={() => handleWishlistAdd(p)}
                    className="p-2 border rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
                    title="Add to Wishlist"
                  >
                    <Heart size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
