import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { TrendingUp, TrendingDown, PackageOpen, AlertTriangle, IndianRupee, Layers, ShoppingBag, Truck } from "lucide-react";

export default function DashboardOverview() {
  const { user } = useAuth();
  
  // Analytics State
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
     totalRevenue: 0,
     totalPurchases: 0,
     inventoryValuation: 0,
     totalUniqueSKUs: 0,
     salesCount: 0,
     purchaseCount: 0
  });
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user) return;
      try {
        // Fetch Invoices
        const invQ = query(collection(db, "invoices"), where("storeId", "==", user.uid));
        const invSnap = await getDocs(invQ);
        const invoices = [];
        invSnap.forEach(d => invoices.push(d.data()));

        let revenue = 0;
        let spend = 0;
        let sCount = 0;
        let pCount = 0;
        
        invoices.forEach(inv => {
           if (inv.type === "sale") {
              revenue += inv.totalAmount;
              sCount++;
           } else if (inv.type === "purchase") {
              spend += inv.totalAmount;
              pCount++;
           } 
           // Backward compatibility for MVP phase before "type" was added
           else {
              revenue += inv.totalAmount;
              sCount++;
           }
        });

        // Fetch Products
        const prodQ = query(collection(db, "products"), where("storeId", "==", user.uid));
        const prodSnap = await getDocs(prodQ);
        const products = [];
        let totalVal = 0;
        const lowStock = [];

        prodSnap.forEach(d => {
           const pData = d.data();
           products.push({ id: d.id, ...pData });
           totalVal += (pData.price * Math.max(0, pData.stock)); // valuation
           if (pData.stock < 10) {
              lowStock.push({ id: d.id, ...pData });
           }
        });
        
        lowStock.sort((a, b) => a.stock - b.stock);

        setMetrics({
           totalRevenue: revenue,
           totalPurchases: spend,
           inventoryValuation: totalVal,
           totalUniqueSKUs: products.length,
           salesCount: sCount,
           purchaseCount: pCount
        });
        setLowStockItems(lowStock.slice(0, 5)); // Limit to top 5 alerts
      } catch (err) {
        console.error("Failed to load analytics: ", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [user]);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-bold text-lg">Crunching store analytics...</div>;

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border shadow-[0_4px_30px_-5px_rgba(0,0,0,0.05)]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground mt-1">Real-time metrics mapping your business trajectory.</p>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {/* KPI Card 1 */}
         <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-xl group-hover:bg-green-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-4 text-green-700 dark:text-green-400">
               <div className="p-2 bg-green-500/20 rounded-lg"><TrendingUp size={20}/></div>
               <h3 className="font-bold text-sm uppercase tracking-widest">Total Revenue</h3>
            </div>
            <div className="text-3xl font-black flex items-center tracking-tight"><IndianRupee size={24} className="mr-1 opacity-50"/>{metrics.totalRevenue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium tracking-wide">Across {metrics.salesCount} Sales Transactions</p>
         </div>

         {/* KPI Card 2 */}
         <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-xl group-hover:bg-orange-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-4 text-orange-700 dark:text-orange-400">
               <div className="p-2 bg-orange-500/20 rounded-lg"><TrendingDown size={20}/></div>
               <h3 className="font-bold text-sm uppercase tracking-widest">Purchase Spend</h3>
            </div>
            <div className="text-3xl font-black flex items-center tracking-tight"><IndianRupee size={24} className="mr-1 opacity-50"/>{metrics.totalPurchases.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium tracking-wide">Across {metrics.purchaseCount} Wholsesale Bills</p>
         </div>

         {/* KPI Card 3 */}
         <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4 text-blue-700 dark:text-blue-400">
               <div className="p-2 bg-blue-500/20 rounded-lg"><Layers size={20}/></div>
               <h3 className="font-bold text-sm uppercase tracking-widest">Asset Valuation</h3>
            </div>
            <div className="text-3xl font-black flex items-center tracking-tight"><IndianRupee size={24} className="mr-1 opacity-50"/>{metrics.inventoryValuation.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            <p className="text-xs text-muted-foreground mt-2 font-medium tracking-wide">Total Market Value of Live Stock</p>
         </div>

         {/* KPI Card 4 */}
         <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4 text-primary">
               <div className="p-2 bg-primary/10 rounded-lg"><PackageOpen size={20}/></div>
               <h3 className="font-bold text-sm uppercase tracking-widest">Live Inventory</h3>
            </div>
            <div className="text-3xl font-black flex items-center tracking-tight">{metrics.totalUniqueSKUs} <span className="text-sm font-bold text-muted-foreground ml-2 uppercase">Unique SKUs</span></div>
            <p className="text-xs text-primary/70 mt-2 font-bold tracking-wide">Tracked natively in real-time</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
         {/* Actionable Insights: Low Stock */}
         <div className="bg-card border border-border shadow-sm rounded-3xl p-1 overflow-hidden">
            <div className="bg-red-500/5 dark:bg-red-500/10 p-6 border-b border-red-500/10 flex items-center gap-3">
               <AlertTriangle className="text-red-500"/>
               <div>
                 <h2 className="text-lg font-black tracking-tight text-red-900 dark:text-red-400">Critical Stock Alerts</h2>
                 <p className="text-sm text-red-700/80 dark:text-red-300">Inventory hitting the &lt;10 stock threshold</p>
               </div>
            </div>
            <div className="divide-y divide-border/50">
               {lowStockItems.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground font-medium">All stock levels are optimal!</div>
               ) : (
                  lowStockItems.map(item => (
                     <div key={item.id} className="p-4 px-6 flex justify-between items-center hover:bg-muted/30 transition-colors">
                        <div>
                           <div className="font-bold flex items-center gap-2">{item.name}</div>
                           <div className="text-xs text-muted-foreground font-mono mt-1">{item.barcode}</div>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="text-sm font-black whitespace-nowrap bg-background border px-3 py-1 rounded shadow-sm">₹{item.price} EA</span>
                           {item.stock <= 0 ? (
                              <span className="bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-sm tracking-widest">DEPLETED</span>
                           ) : (
                              <span className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 text-xs font-black px-3 py-1.5 rounded-full tracking-widest">QTY: {item.stock}</span>
                           )}
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>

         {/* Info Graphic Pane */}
         <div className="bg-gradient-to-b from-card to-background border border-border shadow-sm rounded-3xl p-8 relative overflow-hidden flex flex-col justify-center text-center">
            <div className="absolute -inset-2 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none"></div>
            
            <div className="flex justify-center gap-8 mb-8 opacity-80">
              <div className="flex flex-col items-center gap-3">
                 <div className="w-16 h-16 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center shadow-lg -rotate-6">
                    <Truck size={28}/>
                 </div>
                 <span className="text-xs font-black tracking-widest uppercase">P-Bills</span>
              </div>
              <div className="flex flex-col items-center gap-3 mt-4">
                 <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg rotate-6">
                    <ShoppingBag size={28}/>
                 </div>
                 <span className="text-xs font-black tracking-widest uppercase">S-Bills</span>
              </div>
            </div>

            <h3 className="text-2xl font-black tracking-tight mb-2">Automated Ledger Logic</h3>
            <p className="text-muted-foreground leading-relaxed text-sm max-w-sm mx-auto">
               Your terminal automatically maintains live synchronization. Purchases immediately inject stock directly into your assets, and Sales securely process outwards without dropping boundaries beneath zero.
            </p>
         </div>
      </div>
      
    </div>
  );
}
