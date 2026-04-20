/**
 * SnappyStrike ERP - POS.jsx
 * 
 * Point of Sale (POS) Terminal System.
 * Features dual-mode billing (Retail Sales vs Supplier Purchases), real-time inventory deduction,
 * dynamic local storage persistence for cart recovery, hardware barcode optics, and dense A4 thermal printing.
 */
import { useState, useEffect, useRef } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Html5Qrcode } from "html5-qrcode";
import toast from "react-hot-toast";
import { Download, X, ShoppingCart, PlusCircle, AlertCircle, Camera } from "lucide-react";

export default function POS() {
  const { user } = useAuth();
  
  // App States
  const [entityName, setEntityName] = useState("");
  const [products, setProducts] = useState([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  
  // UI Modals
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  // Quick Add Product State
  const [newProd, setNewProd] = useState({ name: "", price: "", barcode: "", stock: "" });

  // Refs for Scanner closures to avoid re-mounting camera
  const productsRef = useRef([]);
  const modeRef = useRef("sale");

  // Store Profile Fetch
  const [storeMeta, setStoreMeta] = useState({});

  // Cart & Bill States - Lazy initialization correctly syncs memory initially and prevents React race conditions wiping data!
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem(`pos_cart_${user?.uid}`);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch { return []; }
  });
  const [taxRate, setTaxRate] = useState(() => Number(localStorage.getItem(`pos_tax_${user?.uid}`)) || 0);
  const [globalDiscount, setGlobalDiscount] = useState(() => Number(localStorage.getItem(`pos_discount_${user?.uid}`)) || 0);
  const [mode, setMode] = useState(() => localStorage.getItem(`pos_mode_${user?.uid}`) || "sale");

  // Sync to local storage on changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`pos_cart_${user.uid}`, JSON.stringify(cart));
      localStorage.setItem(`pos_tax_${user.uid}`, taxRate);
      localStorage.setItem(`pos_discount_${user.uid}`, globalDiscount);
      localStorage.setItem(`pos_mode_${user.uid}`, mode);
    }
  }, [cart, taxRate, globalDiscount, mode, user]);

  useEffect(() => {
    const fetchStore = async () => {
      if(!user) return;
      const sDoc = await getDoc(doc(db, "stores", user.uid));
      if(sDoc.exists()) setStoreMeta(sDoc.data());
    };
    fetchStore();
  }, [user]);

  // Load store's products setup
  const fetchProducts = async () => {
    const q = query(collection(db, "products"), where("storeId", "==", user.uid));
    const snap = await getDocs(q);
    const prodList = [];
    snap.forEach(doc => prodList.push({ id: doc.id, ...doc.data() }));
    setProducts(prodList);
  };
  
  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  // Keep refs synchronized
  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Camera Permission Pre-check & Barcode Scanning Logic
  const toggleScanner = () => {
    setScannerActive(prev => !prev);
  };

  useEffect(() => {
    let html5QrCode;
    let isScanning = false;
    
    // Throttle tracker to prevent scanning the same code multiple times a second
    let lastScanTime = 0; 

    if (scannerActive) {
      html5QrCode = new Html5Qrcode("reader");
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 }, disableFlip: false };
      
      html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
          // Throttler (1.5s cooldown)
          const now = Date.now();
          if (now - lastScanTime < 1500) return;
          lastScanTime = now;

          const product = productsRef.current.find(p => p.barcode === decodedText);
          if (product) {
            addToCart(product, modeRef.current);
          } else {
            toast.error(`Unknown barcode: ${decodedText}`);
            if (modeRef.current === "purchase") setShowQuickAdd(true);
          }
        },
        (errorMessage) => {
          // parse errors are normal (e.g. barcode not in frame), optionally ignore
        }
      ).then(() => {
        isScanning = true;
      }).catch((err) => {
        console.error("Camera Core Setup Failed:", err);
        toast.error("Failed to access camera securely.");
        setScannerActive(false);
      });
    }

    // Cleanup phase natively stops track streams
    return () => {
      if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
        }).catch(err => console.error("Error stopping camera", err));
      }
    };
  }, [scannerActive]);

  const handleBarcodeScanned = (barcode) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product, mode);
    } else {
      toast.error(`Unknown barcode: ${barcode}`);
      if (mode === "purchase") setShowQuickAdd(true);
    }
  };

  const addToCart = (product, activeMode = mode) => {
    // Zero-Stock Check Logic
    if (activeMode === "sale" && product.stock <= 0) {
      toast((t) => (
        <div className="flex gap-2 items-center">
          <AlertCircle className="text-orange-500"/> 
          <span><b>{product.name}</b> stock is ZERO, but added to bill anyway.</span>
        </div>
      ), { duration: 4000 });
    } else {
      toast.success(`${product.name} added`);
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1, discount: 0 }];
    });
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (manualBarcode) {
      handleBarcodeScanned(manualBarcode);
      setManualBarcode("");
    }
  };

  const handleQuickAddProduct = async (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !newProd.barcode || !newProd.stock) return toast.error("Missing fields! Barcode, Name, Price, and Stock are strictly required.");
    try {
      const pData = {
        storeId: user.uid,
        name: newProd.name,
        price: Number(newProd.price),
        barcode: newProd.barcode,
        category: "General",
        stock: Number(newProd.stock)
      };
      const docRef = await addDoc(collection(db, "products"), pData);
      const builtProd = { id: docRef.id, ...pData };
      setProducts(prev => [...prev, builtProd]);
      addToCart(builtProd);
      setShowQuickAdd(false);
      setNewProd({ name: "", price: "", barcode: "", stock: "" });
      toast.success("Created and added to bill!");
    } catch(err) {
      toast.error("Failed to create product");
    }
  };

  // Cart operations
  const updateItemQty = (id, delta) => setCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  const updateItemDiscount = (id, disc) => setCart(prev => prev.map(item => item.id === id ? { ...item, discount: Math.min(100, Math.max(0, Number(disc))) } : item));
  const updateItemPrice = (id, newPrice) => setCart(prev => prev.map(item => item.id === id ? { ...item, price: Math.max(0, Number(newPrice)) } : item));
  const removeItem = (id) => setCart(prev => prev.filter(item => item.id !== id));

  // Arithmetic
  const subTotal = cart.reduce((acc, item) => acc + (item.price * item.qty * (1 - (item.discount || 0) / 100)), 0);
  const discountAmount = subTotal * (globalDiscount / 100);
  const afterGlobalDiscount = subTotal - discountAmount;
  const taxAmount = afterGlobalDiscount * (taxRate / 100);
  const totalAmount = afterGlobalDiscount + taxAmount;

  // Checkout Protocol
  const processSale = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (mode === "purchase" && !entityName.trim()) return toast.error("Company/Supplier Name is completely required for a Purchase Bill.");
    
    let toastId;
    try {
      toastId = toast.loading(`Generating ${mode} bill...`);
      
      // 1. Fetch sequence by sizing the invoices collection (Guaranteed Permission Match)
      const invQ = query(collection(db, "invoices"), where("storeId", "==", user.uid), where("type", "==", mode));
      const invSnap = await getDocs(invQ);
      const nextSequence = invSnap.size + 1;
      const generatedBillNumber = (mode === "sale" ? "S" : "P") + nextSequence;

      // 2. Push physical Bill payload
      const payload = {
        storeId: user.uid,
        type: mode,
        billNumber: generatedBillNumber,
        entityName: entityName || "Walk-in Customer",
        items: cart,
        subTotal: subTotal,
        globalDiscount: globalDiscount,
        taxRate: taxRate,
        tax: taxAmount,
        totalAmount: totalAmount,
        date: new Date().toISOString()
      };
      
      // Database Write
      await addDoc(collection(db, "invoices"), payload);

      // 3. Inventory Sync Logic. 
      // If sale -> deduct bounding at 0 using logic inside cloud functions ideally, but here we can iterate.
      for (const item of cart) {
        const prodRef = doc(db, "products", item.id);
        const prodMatch = products.find(p => p.id === item.id);
        
        let qtyChange = 0;
        if (mode === "purchase") {
          qtyChange = item.qty; // Buying stock
        } else if (mode === "sale") {
          // Prevent negative stocks. If original stock was 5 and we sold 10, technically we should drop to 0, which means decrease by -5.
          const actualStock = prodMatch ? prodMatch.stock : 0;
          const dropAmount = Math.min(actualStock, item.qty);
          qtyChange = -dropAmount;
        }

        if (qtyChange !== 0) {
          try { await updateDoc(prodRef, { stock: increment(qtyChange) }); } catch(err){ console.error(err); }
        }
      }

      // Refresh local stock cache seamlessly
      fetchProducts();
      
      toast.success("Bill successfully generated!", { id: toastId });
      setLastInvoice({ id: generatedBillNumber, ...payload }); // using custom bill number format
      setShowPrintModal(true);
      
      // Clean House
      setCart([]);
      setTaxRate(0);
      setGlobalDiscount(0);
      setEntityName("");
    } catch(err) {
      if (toastId) toast.dismiss(toastId);
      toast.error("Failed to process sale: " + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)] print:block print:h-auto print:bg-white print:m-0 print:p-0">

      {/* Print-only global style override */}
      <style>{`@media print { body * { visibility: hidden; } .print-receipt, .print-receipt * { visibility: visible !important; } .print-receipt { position: fixed; left: 0; top: 0; width: 100%; padding: 12mm 15mm !important; } }`}</style>
      
      {/* 
        ======================================================== 
        PRINT MODAL UI
        ======================================================== 
      */}
      {showPrintModal && lastInvoice && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center overflow-y-auto py-8 print:p-0 print:bg-white print:backdrop-blur-none print:z-0">
          {/* Dense Print Wrapper */}
          <div className="print-receipt bg-white text-black p-8 rounded-xl shadow-2xl max-w-lg w-full border border-gray-200 m-auto print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full print:rounded-none">
            <div className="text-center mb-4 print:mb-2 border-b-2 border-black pb-2">
              <h1 className="text-2xl print:text-lg font-black tracking-widest">{storeMeta.name || "COMPANY STORE"}</h1>
              {storeMeta.mobileNumber && <p className="text-xs print:text-[10px] font-bold">Tel: {storeMeta.mobileNumber}</p>}
              <h2 className="text-lg print:text-sm font-bold uppercase mt-2">{lastInvoice.type === 'purchase' ? 'Purchase Bill' : 'Retail Receipt'}</h2>
              <div className="flex justify-between print:text-[9px] text-xs font-bold mt-2">
                <span>Inv: #{lastInvoice.billNumber}</span>
                <span>{new Date(lastInvoice.date).toLocaleString()}</span>
              </div>
              {lastInvoice.entityName && <p className="text-xs print:text-[9px] mt-1 text-left">{lastInvoice.type === 'purchase' ? 'Supplier: ' : 'Customer: '} <span className="font-bold">{lastInvoice.entityName}</span></p>}
            </div>
            
            <table className="w-full text-sm print:text-[9px] mb-3 table-fixed">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-1.5 print:py-0.5 font-bold uppercase tracking-wider w-[50%]">Item</th>
                  <th className="text-center py-1.5 print:py-0.5 font-bold uppercase tracking-wider w-[25%]">Qty × Price</th>
                  <th className="text-right py-1.5 print:py-0.5 font-bold uppercase tracking-wider w-[25%]">Amount</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {lastInvoice.items.map(item => (
                  <tr key={item.id} className="border-b border-gray-200 border-dashed print:border-gray-300">
                    <td className="py-1.5 print:py-0.5 leading-tight pr-2">
                       <span className="font-bold block break-words">{item.name}</span>
                       {item.discount > 0 && <span className="block text-[10px] print:text-[7px] text-gray-500 font-medium">(-{item.discount}% off)</span>}
                    </td>
                    <td className="text-center py-1.5 print:py-0.5 whitespace-nowrap">{item.qty} × ₹{item.price}</td>
                    <td className="text-right py-1.5 print:py-0.5 font-black whitespace-nowrap">
                      ₹{((item.price * item.qty) * (1 - item.discount / 100)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="border-t-2 border-black text-sm print:text-[9px] font-medium pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{lastInvoice.subTotal.toFixed(2)}</span>
              </div>
              {lastInvoice.globalDiscount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Discount ({lastInvoice.globalDiscount}%)</span>
                  <span>- ₹{((lastInvoice.subTotal * lastInvoice.globalDiscount) / 100).toFixed(2)}</span>
                </div>
              )}
              {lastInvoice.taxRate > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax ({lastInvoice.taxRate}%)</span>
                  <span>+ ₹{lastInvoice.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl print:text-sm font-black border-t-2 border-dashed border-black pt-2 mt-2">
                <span>GRAND TOTAL</span>
                <span>₹{lastInvoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Signature Block Footer */}
            <div className="mt-8 print:mt-12 flex justify-between items-end text-[10px] print:text-[8px] font-bold">
               <div className="text-center">
                  <div className="border-t border-black w-24 pt-1 mb-1">Customer Sign</div>
               </div>
               <div className="text-center">
                  <div className="border-t border-black w-32 pt-1 mb-1">Authorized Signature</div>
                  <div className="italic text-gray-500">{storeMeta.name}</div>
               </div>
            </div>
            
            <div className="flex gap-4 mt-8 print:hidden">
               <button onClick={() => window.print()} className="flex-1 bg-black text-white py-3 rounded-lg font-bold hover:opacity-90 flex items-center justify-center gap-2"><Download size={18}/> Print / PDF</button>
               <button onClick={() => setShowPrintModal(false)} className="px-5 bg-gray-200 text-black py-3 rounded-lg font-bold hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 
        ======================================================== 
        QUICK ADD PRODUCT MODAL (PURCHASE MODE ONLY)
        ======================================================== 
      */}
       {showQuickAdd && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex py-10 justify-center overflow-y-auto print:hidden">
           <div className="bg-card w-full max-w-md m-auto rounded-2xl shadow-2xl border p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold flex items-center gap-2"><PlusCircle className="text-primary"/> Quick Add New Item</h2>
                 <button onClick={() => setShowQuickAdd(false)} className="text-muted-foreground hover:text-foreground"><X/></button>
              </div>
              <form onSubmit={handleQuickAddProduct} className="space-y-4">
                 <div>
                    <label className="text-sm font-bold block mb-1">Product Name</label>
                    <input type="text" value={newProd.name} onChange={e=>setNewProd({...newProd, name: e.target.value})} className="w-full p-2 border rounded focus:ring-1" required/>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold block mb-1">Base Price (₹)</label>
                      <input type="number" min="0" value={newProd.price} onChange={e=>setNewProd({...newProd, price: e.target.value})} className="w-full p-2 border rounded focus:ring-1" required/>
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-1 underline decoration-primary underline-offset-4">Initial Stock</label>
                      <input type="number" min="0" value={newProd.stock} onChange={e=>setNewProd({...newProd, stock: e.target.value})} placeholder="e.g. 100" className="w-full p-2 border rounded focus:ring-1 border-primary/30 bg-primary/5" required/>
                    </div>
                 </div>
                 <div>
                    <label className="text-sm font-bold block mb-1">Barcode (Required)</label>
                    <input type="text" value={newProd.barcode} onChange={e=>setNewProd({...newProd, barcode: e.target.value})} className="w-full p-2 border rounded focus:ring-1 bg-muted font-mono" required/>
                 </div>
                 <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg mt-6 hover:opacity-90">Inject & Add to Bill</button>
              </form>
           </div>
        </div>
      )}


      {/* 
        ======================================================== 
        MAIN TERMINAL CONTROLS
        ======================================================== 
      */}
      <div className="lg:col-span-7 flex flex-col gap-4 print:hidden h-full">
        
        {/* Toggle Controls */}
        <div className="bg-card border rounded-xl overflow-hidden flex shadow-sm">
           <button 
             onClick={() => setMode("sale")} 
             className={`flex-1 py-3 font-bold text-sm tracking-wide uppercase transition-all ${mode === "sale" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
           >
             Customer Sales 
           </button>
           <button 
             onClick={() => setMode("purchase")} 
             className={`flex-1 py-3 font-bold text-sm tracking-wide uppercase transition-all ${mode === "purchase" ? "bg-blue-600 text-white" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
           >
             Supplier Purchases 
           </button>
        </div>

        {/* Inputs Hub */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          
          <div className="mb-5 pb-5 border-b grid md:grid-cols-2 gap-4">
             <div>
               <label className="text-xs font-bold uppercase text-muted-foreground block mb-2">{mode === "purchase" ? "Company / Supplier Name" : "Customer Ledger Name"}</label>
               <input 
                 type="text" 
                 placeholder={mode === "purchase" ? "Required: Supplier Name" : "Optional: Client Name"}
                 className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all ${mode === 'purchase' && !entityName ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : 'bg-background'}`}
                 value={entityName}
                 onChange={e => setEntityName(e.target.value)}
               />
             </div>
             {mode === "purchase" && (
                <div className="flex flex-col justify-end">
                  <button onClick={() => setShowQuickAdd(true)} className="p-2.5 bg-muted border rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-primary/10 hover:text-primary transition-all text-sm">
                    <PlusCircle size={18}/> Quick Create Missing Product
                  </button>
                </div>
             )}
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold flex items-center gap-2"><Camera className="text-primary"/> Scanner Feed</h2>
            <button 
               onClick={toggleScanner}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${scannerActive ? 'bg-destructive text-destructive-foreground shadow-sm hover:opacity-90' : 'bg-green-500 text-white shadow-sm hover:opacity-90'}`}
            >
              {scannerActive ? 'Suspend Camera' : 'Activate Optic Scanner'}
            </button>
          </div>
          
          {scannerActive ? (
            <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-black border-4 border-muted/50 shadow-inner"></div>
          ) : (
             <div className="w-full h-32 bg-muted rounded-xl flex items-center justify-center text-muted-foreground border-2 border-dashed border-border text-center p-4 font-medium text-sm">
              Camera is sleeping. Wake it up or type barcode manually.
            </div>
          )}

          <div className="mt-5">
            <form onSubmit={handleManualAdd} className="flex gap-2 relative">
              <input 
                type="text" 
                className="flex-1 p-3 border-2 border-input rounded-xl bg-background focus:border-primary outline-none font-mono tracking-widest text-lg" 
                placeholder="Type barcode ID..."
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
              />
              <button type="submit" className="bg-primary text-primary-foreground px-6 rounded-xl font-bold shadow-sm active:scale-95 transition-transform">Push</button>
            </form>
          </div>
        </div>
      </div>

      {/* 
        ======================================================== 
        CHECKOUT / CART TERMINAL
        ======================================================== 
      */}
      <div className="lg:col-span-5 bg-card border border-border rounded-xl flex flex-col h-full print:hidden shadow-lg overflow-hidden">
        
        <div className={`p-4 flex justify-between items-center shadow-sm z-10 transition-colors ${mode === 'sale' ? 'bg-primary text-primary-foreground' : 'bg-blue-600 text-white'}`}>
          <h2 className="text-xl font-black flex items-center gap-2">
            <ShoppingCart size={22}/> 
            {mode === "sale" ? "Sales Terminal" : "Purchase Terminal"}
          </h2>
          <span className="text-xs font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">{cart.length} active items</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm opacity-50">
              <div className="w-20 h-20 mb-4 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center">
                 <ShoppingCart size={32}/>
              </div>
              <p className="font-bold text-lg">Awaiting Items</p>
              <p className="text-xs">Laser scan or type barcodes</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex flex-col gap-2 p-4 bg-background border border-border rounded-xl shadow-sm relative group hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <div className="font-bold tracking-tight">{item.name}</div>
                    <div className="flex gap-2 items-center mt-2">
                       <label className="text-[10px] uppercase font-bold text-muted-foreground">Override Unit Price (₹)</label>
                       <input 
                          type="number" min="0" value={item.price} 
                          onChange={(e) => updateItemPrice(item.id, e.target.value)}
                          className="w-20 px-2 py-1 text-xs border rounded-md font-bold focus:ring-1 outline-none text-primary bg-primary/5 border-primary/20" 
                       />
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-white transition-colors">
                    <X size={14}/>
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wider">Quantity</span>
                     <div className="flex items-center bg-muted rounded-lg border overflow-hidden">
                       <button onClick={() => updateItemQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors">-</button>
                       <span className="text-sm font-black w-8 text-center bg-background h-8 leading-8 border-x">{item.qty}</span>
                       <button onClick={() => updateItemQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors">+</button>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wider">Item Disc(%)</span>
                       <div className="relative">
                          <input 
                            type="number" min="0" max="100" value={item.discount} onChange={(e) => updateItemDiscount(item.id, e.target.value)}
                            className="w-16 py-1.5 px-2 text-xs border rounded-md text-right font-bold focus:ring-1 focus:ring-primary outline-none" 
                          />
                          <span className="absolute left-2 top-1.5 text-xs text-muted-foreground font-bold pointer-events-none">%</span>
                       </div>
                    </div>
                    <div className="flex flex-col items-end pl-2 border-l">
                       <span className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-wider">Final</span>
                       <div className="font-black text-lg text-foreground w-20 text-right text-primary">
                         ₹{((item.price * item.qty) * (1 - item.discount / 100)).toFixed(2)}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-card p-5 border-t border-border shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Global Disc (%)</label>
              <input 
                type="number" min="0" max="100" value={globalDiscount} onChange={e => setGlobalDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full p-2.5 border-2 border-input rounded-lg focus:border-primary outline-none text-sm font-bold bg-muted/30 focus:bg-background transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Tax Engine (%)</label>
              <input 
                type="number" min="0" max="100" value={taxRate} onChange={e => setTaxRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full p-2.5 border-2 border-input rounded-lg focus:border-primary outline-none text-sm font-bold bg-muted/30 focus:bg-background transition-colors"
              />
            </div>
          </div>
          
          <div className="space-y-2 text-sm font-medium">
            <div className="flex justify-between text-muted-foreground">
              <span>Gross Ledger</span>
              <span>₹{subTotal.toFixed(2)}</span>
            </div>
            {globalDiscount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Bundle Discount</span>
                <span>- ₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Calculated Tax</span>
                <span>+ ₹{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-3xl font-black pt-4 border-t mt-4 tracking-tight items-center">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Owed Total</span>
              <span className={"text-primary"}>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            onClick={processSale}
            className={`w-full py-5 rounded-2xl font-black text-xl hover:opacity-95 mt-6 shadow-xl active:scale-[0.98] transition-all tracking-wider ${mode === 'sale' ? 'bg-primary text-primary-foreground shadow-primary/25' : 'bg-blue-600 text-white shadow-blue-500/25'}`}
          >
            EXECUTE {mode.toUpperCase()}
          </button>
        </div>

      </div>
    </div>
  );
}
