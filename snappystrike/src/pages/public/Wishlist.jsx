import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loadWishlist, syncWishlist } from "../../lib/wishlistHelpers";
import toast from "react-hot-toast";
import { Trash2, ShoppingCart, Minus, Plus, Heart } from "lucide-react";

export default function Wishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await loadWishlist(user);
        setItems(data);
      } catch (e) {
        console.error("Wishlist load error", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const save = async (newItems) => {
    setItems(newItems);
    await syncWishlist(newItems, user);
  };

  const updateQuantity = (id, delta) => {
    save(items.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  const removeItem = (id) => {
    save(items.filter(i => i.id !== id));
    toast.success("Removed from wishlist");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse font-bold">Loading wishlist...</div>;

  return (
    <div className="min-h-screen bg-background border-t border-border">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <Heart className="text-destructive" size={32} fill="currentColor" /> Your Wishlist
          </h1>
          <div className="flex items-center gap-4">
            {!user && (
               <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                 Log in to save to cloud &rarr;
               </Link>
            )}
            <Link to="/" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
              ← Explore Stores
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
            <ShoppingCart className="mx-auto text-muted mb-4" size={48} />
            <h2 className="text-xl font-bold text-foreground">Your wishlist is empty.</h2>
            <p className="text-muted-foreground mt-2 mb-6">Start exploring stores nearby to add your favorite products!</p>
            <Link to="/" className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:opacity-90">
              Explore Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium">{items.length} item{items.length > 1 ? 's' : ''} saved {user ? '(synced to cloud)' : '(stored locally)'}</p>
            {items.map(item => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex-1">
                  <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                  <p className="text-sm text-primary font-bold mt-1">₹{item.price}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-muted rounded-full overflow-hidden border border-border">
                    <button onClick={() => updateQuantity(item.id, -1)} className="px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"><Minus size={14}/></button>
                    <span className="w-8 text-center font-bold text-sm bg-background border-x border-border block h-full leading-relaxed py-1">{item.qty}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"><Plus size={14}/></button>
                  </div>
                  
                  <button onClick={() => removeItem(item.id)} className="text-destructive p-2 hover:bg-destructive/10 rounded-full transition-colors" title="Remove">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
