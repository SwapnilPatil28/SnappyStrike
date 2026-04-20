import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Receipt, Store, LogOut, FileArchive, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function DashboardLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Overview", path: "/seller/dashboard", icon: LayoutDashboard },
    { name: "Inventory", path: "/seller/inventory", icon: Package },
    { name: "POS / Billing", path: "/seller/pos", icon: Receipt },
    { name: "Invoice History", path: "/seller/bills", icon: FileArchive },
    { name: "Store Settings", path: "/seller/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
            <Store className="text-primary" /> SnappyERP
          </h2>
          <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
