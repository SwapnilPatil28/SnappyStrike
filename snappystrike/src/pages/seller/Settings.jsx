import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { Settings as SettingsIcon, Store, Phone, AlignLeft, Tags, CheckCircle2, ExternalLink, Copy } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [storeData, setStoreData] = useState({
    storeName: "",
    mobileNumber: "",
    description: "",
    description: "",
    activeOffers: "",
    username: ""
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "stores", user.uid);
        const dataSnap = await getDoc(docRef);
        if (dataSnap.exists()) {
          const payload = dataSnap.data();
          setStoreData({
            storeName: payload.name || payload.storeName || "",
            mobileNumber: payload.mobileNumber || "",
            description: payload.description || "",
            activeOffers: payload.activeOffers || "",
            username: payload.username || ""
          });
        }
      } catch (err) {
        console.error("Failed fetching settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!storeData.mobileNumber.trim()) {
      return toast.error("Mobile Number is compulsory!");
    }
    
    setSaving(true);
    try {
      const docRef = doc(db, "stores", user.uid);
      await setDoc(docRef, {
        ownerId: user.uid,
        name: storeData.storeName, // Bind standard field map
        storeName: storeData.storeName,
        mobileNumber: storeData.mobileNumber,
        description: storeData.description,
        activeOffers: storeData.activeOffers,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      toast.success("Store Profile updated successfully!");
    } catch(err) {
      toast.error("Failed to commit settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground animate-pulse font-bold text-center">Loading Configuration...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-card border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3"><SettingsIcon className="text-primary"/> Store Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Design the public metadata that buyers will see when traversing your Digital Storefront.</p>
        </div>
        {storeData.username && (
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => {
                const url = `${window.location.origin}/stores/${storeData.username}`;
                navigator.clipboard.writeText(url);
                toast.success("Store link copied!");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground hover:text-foreground font-bold rounded-lg transition-colors border"
            >
              <Copy size={16}/> Copy Link
            </button>
            <a 
              href={`/stores/${storeData.username}`} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              <ExternalLink size={16}/> Visit Store
            </a>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-card border rounded-2xl shadow-sm p-8 space-y-6">
         <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2"><Store size={18}/> Digital Store Name</label>
            <input 
               type="text" 
               className="w-full p-3 border-2 rounded-xl focus:border-primary outline-none transition-colors"
               value={storeData.storeName}
               onChange={e => setStoreData({...storeData, storeName: e.target.value})}
               placeholder="Example: Snappy Retail Hub"
               required
            />
         </div>

         <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2"><Phone size={18}/> Contact / Mobile Number <span className="text-destructive">*</span></label>
            <input 
              type="tel" 
              maxLength={10}
              pattern="[0-9]{10}"
              className="w-full p-3 border-2 rounded-xl focus:border-primary outline-none transition-colors"
              value={storeData.mobileNumber}
              onChange={e => {
                  // Remove any character that is not a number
                  const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                  setStoreData({...storeData, mobileNumber: onlyNums});
              }}
              placeholder="10-digit number"
              required
            />
         </div>

         <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2"><AlignLeft size={18}/> Public Store Description</label>
            <textarea 
               rows="4"
               className="w-full p-3 border-2 rounded-xl focus:border-primary outline-none transition-colors resize-none"
               value={storeData.description}
               onChange={e => setStoreData({...storeData, description: e.target.value})}
               placeholder="Welcome to our store! We guarantee the best prices on premium electronics and goods..."
            />
         </div>

         <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2 text-primary"><Tags size={18}/> Active Promotion / Offer Banner</label>
            <input 
               type="text" 
               className="w-full p-3 border-2 rounded-xl focus:border-primary border-primary/30 outline-none transition-colors bg-primary/5"
               value={storeData.activeOffers}
               onChange={e => setStoreData({...storeData, activeOffers: e.target.value})}
               placeholder="Example: 🔥 FLASH SALE: 20% Off all Accessories ending Friday!"
            />
            <p className="text-xs text-muted-foreground font-medium">This text will be brilliantly advertised at the very top of your global storefront webpage.</p>
         </div>

         <div className="pt-6 border-t border-border flex justify-end">
            <button 
               type="submit" 
               disabled={saving}
               className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
               {saving ? "Deploying Block..." : <><CheckCircle2 size={20}/> Save Settings</>}
            </button>
         </div>
      </form>
    </div>
  );
}
