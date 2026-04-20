import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit } from "lucide-react";

export default function Inventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  
  // Basic Form State
  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    price: "",
    stock: "",
    category: ""
  });

  useEffect(() => {
    // Real-time listener for products
    if (!user) return;
    const q = query(collection(db, "products"), where("storeId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prodList = [];
      snapshot.forEach((doc) => prodList.push({ id: doc.id, ...doc.data() }));
      setProducts(prodList);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!formData.barcode) {
      toast.error("Barcode is MANDATORY!");
      return;
    }

    try {
      if (products.some(p => p.barcode === formData.barcode)) {
        toast.error("Product with this barcode already exists.");
        return;
      }

      await addDoc(collection(db, "products"), {
        storeId: user.uid,
        name: formData.name,
        barcode: formData.barcode,
        price: Number(formData.price),
        stock: Number(formData.stock),
        category: formData.category,
        updatedAt: new Date().toISOString()
      });
      toast.success("Product added!");
      setIsAdding(false);
      setFormData({ barcode: "", name: "", price: "", stock: "", category: "" });
    } catch (error) {
      toast.error("Failed to add product: " + error.message);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      const prodRef = doc(db, "products", editingProd.id);
      await updateDoc(prodRef, {
        name: editingProd.name,
        price: Number(editingProd.price),
        barcode: editingProd.barcode,
        category: editingProd.category,
        stock: Number(editingProd.stock)
      });
      toast.success("Product updated successfully");
      setShowEditModal(false);
      setEditingProd(null);
    } catch(err) {
      toast.error("Failed to update product");
    }
  };

  const handleDelete = async (id) => {
    if(confirm("Are you sure you want to delete this product?")) {
      await deleteDoc(doc(db, "products", id));
      toast.success("Product deleted");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">Manage your products and stock. Barcodes are compulsory.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium"
        >
          <Plus size={18} /> {isAdding ? "Cancel" : "Add Product"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddProduct} className="bg-card p-6 rounded-xl border border-border shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium mb-1">Barcode *</label>
            <input required name="barcode" value={formData.barcode} onChange={e=>setFormData({...formData, barcode: e.target.value})} className="w-full p-2 border rounded-md" placeholder="890XXX" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Product Name</label>
            <input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-md" placeholder="Snack Name" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Price (₹)</label>
            <input required type="number" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full p-2 border rounded-md" placeholder="50" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Stock</label>
            <input required type="number" value={formData.stock} onChange={e=>setFormData({...formData, stock: e.target.value})} className="w-full p-2 border rounded-md" placeholder="100" />
          </div>
          <button type="submit" className="bg-secondary text-secondary-foreground p-2 rounded-md font-medium hover:opacity-90 w-full mb-px">
            Save Item
          </button>
        </form>
      )}

      {showEditModal && editingProd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEditProduct} className="bg-card p-6 rounded-xl border border-border shadow-xl w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Edit Product</h2>
            
            <div className="flex items-center gap-4">
              <label htmlFor="barcode" className="w-24 font-medium text-gray-700">Barcode:</label>
              <input id="barcode" required value={editingProd.barcode} onChange={e=>setEditingProd({...editingProd, barcode: e.target.value})} className="flex-1 p-2 border rounded-md" placeholder="Barcode" />
            </div>

            <div className="flex items-center gap-4">
              <label htmlFor="name" className="w-24 font-medium text-gray-700">Name:</label>
              <input id="name" required value={editingProd.name} onChange={e=>setEditingProd({...editingProd, name: e.target.value})} className="flex-1 p-2 border rounded-md" placeholder="Name" />
            </div>

            <div className="flex items-center gap-4">
              <label htmlFor="price" className="w-24 font-medium text-gray-700">Price:</label>
              <input id="price" required type="number" value={editingProd.price} onChange={e=>setEditingProd({...editingProd, price: e.target.value})} className="flex-1 p-2 border rounded-md" placeholder="Price" />
            </div>

            <div className="flex items-center gap-4">
              <label htmlFor="stock" className="w-24 font-medium text-gray-700">Stock:</label>
              <input id="stock" required type="number" value={editingProd.stock} onChange={e=>setEditingProd({...editingProd, stock: e.target.value})} className="flex-1 p-2 border rounded-md" placeholder="Stock" />
            </div>

            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 p-2 border rounded-md">Cancel</button>
              <button type="submit" className="flex-1 p-2 bg-primary text-primary-foreground rounded-md">Update</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-6 py-3 font-medium">Barcode</th>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium text-right">Price</th>
              <th className="px-6 py-3 font-medium text-right">Stock</th>
              <th className="px-6 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.length === 0 ? (
               <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">No products found. Add items to sync to your storefront.</td></tr>
            ) : (
              products.map(p => (
                <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-mono">{p.barcode}</td>
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-right">₹{Number(p.price).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.stock < 10 ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button onClick={() => { setEditingProd(p); setShowEditModal(true); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-md transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
