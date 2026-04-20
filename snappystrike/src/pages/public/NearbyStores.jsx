import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Store as StoreIcon, Navigation } from "lucide-react";
import toast from "react-hot-toast";

export default function NearbyStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pincode, setPincode] = useState("");
  
  // We mock the geolocation radius by simply fetching all stores or matching by pincode in this MVP
  const fetchStoresByPincode = async (e) => {
    e.preventDefault();
    if (!pincode) return;
    setLoading(true);
    
    try {
      // Very basic fetch all and filter client side. In prod, use where("pincode", "==", pincode)
      const q = query(collection(db, "stores"));
      const snap = await getDocs(q);
      const storeList = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.pincode === pincode) {
          storeList.push({ id: doc.id, ...data });
        }
      });
      setStores(storeList);
      if (storeList.length === 0) toast("No stores found in this pincode.");
    } catch (err) {
      toast.error("Error fetching stores: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const useBrowserLocation = () => {
    if ("geolocation" in navigator) {
      toast("Detecting precise location is mocked in this MVP. Showing all stores.");
      fetchAllStores();
    } else {
      toast.error("Geolocation not available");
    }
  };

  const fetchAllStores = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "stores"));
      const snap = await getDocs(q);
      const storeList = [];
      snap.forEach(doc => {
        storeList.push({ id: doc.id, ...doc.data() });
      });
      setStores(storeList);
    } catch (err) {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-6">Find Supermarkets Near You</h2>
        
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm inline-block w-full max-w-xl text-left">
          <form onSubmit={fetchStoresByPincode} className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text"
              placeholder="Enter Pincode"
              className="flex-1 p-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary outline-none"
              value={pincode}
              onChange={e => setPincode(e.target.value)}
            />
            <button type="submit" className="bg-primary text-primary-foreground px-6 py-3 sm:py-0 font-bold rounded-xl hover:opacity-90 transition-opacity">
              Search
            </button>
          </form>
          
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">OR</span>
            <button onClick={useBrowserLocation} className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
              <Navigation size={14} /> Detect my location
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-12">
        {loading && <div className="text-center">Scanning area...</div>}
        
        {!loading && stores.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map(store => (
              <div key={store.id} className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col gap-4 group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <StoreIcon />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{store.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Pincode: {store.pincode}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{store.address}</p>
                <div className="mt-auto pt-4 border-t w-full flex gap-2">
                   <Link to={`/stores/${store.username}`} className="w-full text-center bg-secondary text-secondary-foreground py-2 rounded-lg text-sm font-bold hover:opacity-90">
                     View Storefront
                   </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
