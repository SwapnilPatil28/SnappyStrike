import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function StoreSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const [formData, setFormData] = useState({
    username: "",
    name: "",
    address: "",
    pincode: "",
    location: ""
  });

  useEffect(() => {
    const checkStore = async () => {
      const storeDoc = await getDoc(doc(db, "stores", user.uid)); // use user.uid as storeDoc ID for 1:1 mapping
      if (storeDoc.exists()) {
        toast("Store already configured!");
        navigate("/seller/dashboard");
      }
      setChecking(false);
    };
    if (user) {
      checkStore();
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pincode) {
      return toast.error("Pincode is mandatory!");
    }
    
    setLoading(true);
    try {
      // Create store mapping
      await setDoc(doc(db, "stores", user.uid), {
        ownerId: user.uid,
        ...formData,
        createdAt: new Date().toISOString(),
      });
      
      // Also save a reference by username if we want to do /stores/:username easily
      // A more robust approach might query stores by username, but for MVP we track it here.
      await setDoc(doc(db, "storeUsernames", formData.username), {
        storeId: user.uid
      });

      toast.success("Store setup created!");
      navigate("/seller/dashboard");
    } catch (error) {
      toast.error("Error setting up store: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-sm p-8">
        <h2 className="text-3xl font-bold mb-2 text-foreground">Set up your Storefront</h2>
        <p className="text-muted-foreground mb-6">Enter details to create your digital presence and ERP system.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Store Username (Unique URL)</label>
              <input
                type="text"
                name="username"
                required
                className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. my-supermart"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Store Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                value={formData.name}
                onChange={handleChange}
                placeholder="My Supermart"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Address</label>
            <textarea
              name="address"
              required
              className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none resize-none h-24"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main Street..."
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Pincode (Required for nearby search)</label>
              <input
                type="text"
                name="pincode"
                required
                className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="110001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Google Maps Link (Optional)</label>
              <input
                type="url"
                name="location"
                className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                value={formData.location}
                onChange={handleChange}
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground p-3 rounded-md font-medium hover:opacity-90 disabled:opacity-50 mt-6"
          >
            {loading ? "Saving..." : "Create Digital Storefront"}
          </button>
        </form>
      </div>
    </div>
  );
}
