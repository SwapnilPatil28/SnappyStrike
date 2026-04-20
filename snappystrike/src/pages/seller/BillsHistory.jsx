import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { ChevronDown, ChevronUp, FileText, ShoppingBag, Truck, Printer, Edit, X, Save, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function BillsHistory() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeMeta, setStoreMeta] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState('sale'); 

  // Print State
  const [printBill, setPrintBill] = useState(null);

  // Edit State
  const [editBill, setEditBill] = useState(null);
  const [editCart, setEditCart] = useState([]);

  const fetchInvoices = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "invoices"), where("storeId", "==", user.uid));
      const snap = await getDocs(q);
      const invList = [];
      snap.forEach(doc => invList.push({ id: doc.id, ...doc.data() }));
      invList.sort((a, b) => new Date(b.date) - new Date(a.date));
      setInvoices(invList);
      
      const sDoc = await getDoc(doc(db, "stores", user.uid));
      if(sDoc.exists()) setStoreMeta(sDoc.data());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  // --- EDIT LOGIC --- //
  const startEdit = (inv) => {
    setEditBill(JSON.parse(JSON.stringify(inv))); // deep copy to prevent ref leaks
    setEditCart(JSON.parse(JSON.stringify(inv.items)));
  };

  const handleEditChange = (field, val) => setEditBill(prev => ({ ...prev, [field]: val }));
  
  const handleEditCart = (id, field, val) => {
    setEditCart(prev => prev.map(item => item.id === id ? { ...item, [field]: Number(val) } : item));
  };

  const handleRemoveCartItem = (id) => setEditCart(prev => prev.filter(i => i.id !== id));

  const saveEdit = async () => {
    try {
      // Recompute everything
      const subTotal = editCart.reduce((acc, item) => acc + (item.price * item.qty * (1 - (item.discount || 0) / 100)), 0);
      const discountAmount = subTotal * (editBill.globalDiscount / 100);
      const afterGlobalDiscount = subTotal - discountAmount;
      const taxAmount = afterGlobalDiscount * (editBill.taxRate / 100);
      const totalAmount = afterGlobalDiscount + taxAmount;

      const newPayload = { ...editBill, items: editCart, subTotal, tax: taxAmount, totalAmount };

      // Determine difference
      const original = invoices.find(i => i.id === editBill.id);
      const isDiff = JSON.stringify({ ...newPayload, editCount: undefined }) !== JSON.stringify({ ...original, editCount: undefined });

      if (isDiff) {
        newPayload.editCount = (original.editCount || 0) + 1;
        await updateDoc(doc(db, "invoices", editBill.id), newPayload);
        toast.success("Bill updated & tracker incremented!");
        fetchInvoices();
      } else {
        toast("No changes were made.");
      }
      setEditBill(null);
    } catch (err) {
      toast.error("Validating edits failed: " + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading transaction ledgers...</div>;
  const filteredInvoices = invoices.filter(inv => inv.type === filterType);

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:block print:w-full print:max-w-full print:m-0 print:p-0">
      
      {/* Print-only global style override */}
      <style>{`@media print { body * { visibility: hidden; } .print-receipt-history, .print-receipt-history * { visibility: visible !important; } .print-receipt-history { position: fixed; left: 0; top: 0; width: 100%; padding: 12mm 15mm !important; } }`}</style>
      
      {/* 
        ======================================================== 
        PRINT RECEIPT HIDDEN RENDER 
        ======================================================== 
      */}
      {printBill && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center print:-inset-4 print:bg-white print:backdrop-blur-none print:z-0 py-8 overflow-y-auto">
          {/* Dense Print Wrapper isolated from Dashboard styling */}
          <div className="print-receipt-history bg-white text-black p-8 rounded-xl shadow-2xl max-w-lg w-full border border-gray-200 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full print:rounded-none m-auto shrink-0 relative">
            <button onClick={() => setPrintBill(null)} className="absolute -top-4 -right-4 w-10 h-10 bg-destructive rounded-full text-white flex items-center justify-center print:hidden hover:scale-105 shadow-xl"><X/></button>
            
            <div className="text-center mb-4 print:mb-2 border-b-2 border-black pb-2">
              <h1 className="text-2xl print:text-lg font-black tracking-widest uppercase">{storeMeta.name || "COMPANY STORE"}</h1>
              {storeMeta.mobileNumber && <p className="text-xs print:text-[10px] font-bold">Tel: {storeMeta.mobileNumber}</p>}
              <h2 className="text-lg print:text-sm font-bold uppercase mt-2">{printBill.type === 'purchase' ? 'Purchase Ledger' : 'Retail Receipt'}</h2>
              <div className="flex justify-between print:text-[9px] text-xs font-bold mt-2">
                <span>Inv: #{printBill.billNumber}</span>
                <span>{new Date(printBill.date).toLocaleString()}</span>
              </div>
              {printBill.entityName && <p className="text-xs print:text-[9px] mt-1 text-left">{printBill.type === 'purchase' ? 'Supplier: ' : 'Customer: '} <span className="font-bold">{printBill.entityName}</span></p>}
            </div>
            
            <table className="w-full text-sm print:text-[9px] mb-3 border-collapse table-fixed">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-1.5 print:py-0.5 font-bold uppercase tracking-wider w-[50%]">Item</th>
                  <th className="text-center py-1.5 print:py-0.5 font-bold uppercase tracking-wider w-[25%]">Qty × Price</th>
                  <th className="text-right py-1.5 print:py-0.5 font-bold uppercase tracking-wider w-[25%]">Amount</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {printBill.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 border-dashed print:border-gray-300">
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
                <span>₹{printBill.subTotal.toFixed(2)}</span>
              </div>
              {printBill.globalDiscount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Discount ({printBill.globalDiscount}%)</span>
                  <span>- ₹{((printBill.subTotal * printBill.globalDiscount) / 100).toFixed(2)}</span>
                </div>
              )}
              {printBill.taxRate > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax ({printBill.taxRate}%)</span>
                  <span>+ ₹{printBill.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl print:text-sm font-black border-t-2 border-dashed border-black pt-2 mt-2">
                <span>GRAND TOTAL</span>
                <span>₹{printBill.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-8 print:mt-12 flex justify-between items-end text-[10px] print:text-[8px] font-bold">
               <div className="text-center"><div className="border-t border-black w-24 pt-1 mb-1">Customer Sign</div></div>
               <div className="text-center"><div className="border-t border-black w-32 pt-1 mb-1">Authorized Sign</div><div className="italic text-gray-500">{storeMeta.name}</div></div>
            </div>
            
            <button onClick={() => window.print()} className="w-full mt-6 bg-black text-white py-3 rounded-lg font-bold hover:opacity-90 flex items-center justify-center gap-2 print:hidden"><Printer size={18}/> Push to Printer Stack</button>
          </div>
        </div>
      )}


      {/* 
        ======================================================== 
        EDIT MODAL 
        ======================================================== 
      */}
      {editBill && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
           <div className="bg-card w-full max-w-3xl rounded-xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b flex justify-between items-center shrink-0">
                 <div>
                   <h2 className="text-xl font-bold flex items-center gap-2"><Edit className="text-primary"/> Modify Invoice #{editBill.billNumber}</h2>
                   <p className="text-xs text-muted-foreground">Editing generates an permanent tamper-flag increasing the specific EditCount integer.</p>
                 </div>
                 <button onClick={() => setEditBill(null)} className="p-2 hover:bg-muted rounded"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-muted/10">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase mb-1 block">Entity Name</label>
                      <input type="text" value={editBill.entityName} onChange={e => handleEditChange('entityName', e.target.value)} className="w-full p-2 border bg-background rounded focus:ring-1 outline-none"/>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase mb-1 block">Global Discount (%)</label>
                      <input type="number" value={editBill.globalDiscount} onChange={e => handleEditChange('globalDiscount', Number(e.target.value))} className="w-full p-2 border bg-background rounded focus:ring-1 outline-none"/>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase mb-1 block">Tax Map (%)</label>
                      <input type="number" value={editBill.taxRate} onChange={e => handleEditChange('taxRate', Number(e.target.value))} className="w-full p-2 border bg-background rounded focus:ring-1 outline-none"/>
                    </div>
                 </div>

                 <div className="border rounded-xl bg-background overflow-hidden overflow-x-auto">
                    <table className="w-full min-w-[500px] text-sm">
                       <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-black">
                         <tr><th className="p-3 text-left">Item</th><th className="p-3 w-20 text-center">Unit Px(₹)</th><th className="p-3 w-20 text-center">Qty</th><th className="p-3 w-16 text-center">Disc%</th><th className="p-3 w-12 text-center">X</th></tr>
                       </thead>
                       <tbody>
                         {editCart.map(item => (
                           <tr key={item.id} className="border-t">
                              <td className="p-3 font-semibold text-xs">{item.name}</td>
                              <td className="p-3"><input type="number" value={item.price} onChange={e => handleEditCart(item.id, 'price', e.target.value)} className="w-full border rounded p-1 text-center font-mono"/></td>
                              <td className="p-3"><input type="number" value={item.qty} onChange={e => handleEditCart(item.id, 'qty', e.target.value)} className="w-full border rounded p-1 text-center font-mono"/></td>
                              <td className="p-3"><input type="number" value={item.discount} onChange={e => handleEditCart(item.id, 'discount', e.target.value)} className="w-full border rounded p-1 text-center font-mono"/></td>
                              <td className="p-3 text-center"><button onClick={() => handleRemoveCartItem(item.id)} className="text-destructive hover:scale-110"><X size={16}/></button></td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              <div className="p-5 border-t shrink-0 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-card">
                 <div className="flex items-center gap-2 text-destructive font-bold text-sm bg-destructive/10 px-4 py-2 rounded-lg">
                    <AlertTriangle size={16}/> Overwriting Historical Ledger
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => setEditBill(null)} className="flex-1 sm:flex-none px-5 py-2 rounded-lg border font-bold hover:bg-muted">Cancel</button>
                    <button onClick={saveEdit} className="flex-1 sm:flex-none px-5 py-2 rounded-lg font-bold bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center gap-2"><Save size={18}/> Deploy Math Changes</button>
                 </div>
              </div>
           </div>
        </div>
      )}


      <div className="flex flex-col md:flex-row justify-between items-center bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <FileText className="text-primary" size={32} /> Invoice Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Review your historical retail and wholesale transactions.</p>
        </div>
        
        <div className="bg-muted p-1 rounded-xl flex gap-1 w-full md:w-auto">
           <button 
             onClick={() => setFilterType('sale')}
             className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${filterType === 'sale' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
           >
             <ShoppingBag size={16}/> Retail Sales
           </button>
           <button 
             onClick={() => setFilterType('purchase')}
             className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${filterType === 'purchase' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
           >
             <Truck size={16}/> Supplier B2B
           </button>
        </div>
      </div>

      <div className="space-y-4 print:hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-20 bg-card border border-dashed rounded-2xl text-muted-foreground">
            No {filterType === 'sale' ? 'sales' : 'purchases'} recorded yet in the ledger.
          </div>
        ) : (
          filteredInvoices.map(inv => (
            <div key={inv.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all group relative">
              
              {/* Edit Count Badge! */}
              {inv.editCount > 0 && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-0.5 rounded-b-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                  Edited • {inv.editCount} Tamper Count
                </div>
              )}

              <div 
                className="p-3 md:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer hover:bg-muted/30"
                onClick={() => toggleExpand(inv.id)}
              >
                <div className="flex gap-3 md:gap-4 items-center">
                   <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg shrink-0 ${inv.type === 'sale' ? 'bg-primary/10 text-primary' : 'bg-secondary/20 text-secondary-foreground'}`}>
                      {inv.type === 'sale' ? 'S' : 'P'}
                   </div>
                   <div className="min-w-0">
                     <h3 className="font-extrabold text-base md:text-lg flex items-center gap-2 mt-1 truncate">
                       {inv.billNumber || `#${inv.id.slice(-6).toUpperCase()}`}
                     </h3>
                     <div className="text-[10px] md:text-sm text-muted-foreground font-medium truncate">
                       {new Date(inv.date).toLocaleString()}
                     </div>
                     {inv.entityName && (
                       <div className="text-[9px] md:text-xs uppercase font-bold tracking-wider mt-0.5 text-primary/80 truncate">
                         {inv.type === 'purchase' ? 'Supplier: ' : 'Client: '} {inv.entityName}
                       </div>
                     )}
                   </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-border/30">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] md:text-sm text-muted-foreground font-semibold px-2 md:px-3 py-0.5 md:py-1 bg-muted rounded-full inline-block mb-1">{inv.items.length} lines</p>
                    <p className="font-black text-lg md:text-xl text-foreground">₹{(inv.totalAmount || 0).toFixed(2)}</p>
                  </div>
                  <button className="p-2 hover:bg-muted rounded-full">
                    {expandedId === inv.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === inv.id && (
                <div className="p-4 md:p-6 border-t bg-muted/10 animate-in slide-in-from-top-2">
                  <div className="flex flex-col sm:flex-row gap-2 justify-end mb-4">
                     <button onClick={() => startEdit(inv)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-background border px-4 py-2 rounded-lg text-sm font-bold hover:text-primary transition-colors hover:border-primary/50"><Edit size={16}/> Alter Record</button>
                     <button onClick={() => setPrintBill(inv)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:opacity-90"><Printer size={16}/> PDF Receipt</button>
                  </div>
                  
                  <div className="space-y-2 mb-6 overflow-x-auto">
                    <div className="flex justify-between text-xs font-black tracking-widest border-b border-border/50 pb-3 text-muted-foreground uppercase min-w-[400px]">
                      <span className="w-1/2">Line Item</span>
                      <span className="w-1/6 text-center">Qty / Base</span>
                      <span className="w-1/6 text-center">Disc</span>
                      <span className="w-1/6 text-right">Net</span>
                    </div>
                    {inv.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-3 border-b border-border/30 last:border-0 items-center min-w-[400px]">
                        <span className="font-bold truncate pr-2 w-1/2">{item.name} <span className="text-[10px] text-muted-foreground ml-2 font-mono bg-background px-1 rounded border">{item.barcode}</span></span>
                        <span className="w-1/6 text-center font-medium bg-background border px-2 py-1 rounded">{item.qty} &times; ₹{item.price}</span>
                        <span className="w-1/6 text-center text-destructive font-bold">{item.discount > 0 ? `${item.discount}%` : '-'}</span>
                        <span className="w-1/6 text-right font-black">
                          ₹{((item.price * item.qty) * (1 - (item.discount || 0)/100)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4 border-t text-sm">
                    <div className="w-full sm:w-72 space-y-2 font-medium">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Gross Evaluation</span>
                        <span>₹{(inv.subTotal || 0).toFixed(2)}</span>
                      </div>
                      {inv.globalDiscount > 0 && (
                        <div className="flex justify-between text-destructive bg-destructive/10 px-2 py-1 rounded">
                          <span>Global Disc. ({inv.globalDiscount}%)</span>
                          <span>- ₹{((inv.subTotal * inv.globalDiscount) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {inv.taxRate > 0 && (
                        <div className="flex justify-between text-muted-foreground px-2 py-1 rounded border border-border bg-background">
                          <span>Tax Render ({inv.taxRate}%)</span>
                          <span>+ ₹{(inv.tax || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-lg md:text-xl pt-3 border-t mt-3">
                        <span>Final Settlement</span>
                        <span className="text-primary">₹{(inv.totalAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
