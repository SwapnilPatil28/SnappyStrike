import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import NearbyStores from "./public/NearbyStores";
import GlobalSearch from "../components/GlobalSearch";
import { Heart } from "lucide-react";

export default function Home() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <header className="border-b p-3 md:p-4 flex justify-between items-center bg-card sticky top-0 z-50 shadow-sm gap-2">
        <h1 className="text-2xl font-black text-primary tracking-tighter">SnappyStrike</h1>
        <div>
          {user ? (
            <div className="flex gap-2 md:gap-4 items-center flex-wrap justify-end">
              <span className="text-sm font-medium hidden md:block">Hello, {user.email}</span>
              {role === "buyer" && (
                <Link to="/wishlist" className="bg-background border border-border text-foreground px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-muted">
                  <Heart size={16} className="text-destructive"/> Wishlist
                </Link>
              )}
              {role === "seller" && (
                <button 
                  onClick={() => navigate("/seller/dashboard")}
                  className="bg-accent text-accent-foreground px-4 py-2 rounded-md font-medium text-sm hover:opacity-90 flex items-center gap-2"
                >
                  Dashboard
                </button>
              )}
              <button 
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md font-medium text-sm hover:opacity-90"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/wishlist" className="hidden md:flex bg-background border border-border text-foreground px-4 py-2 rounded-full font-semibold text-sm items-center gap-2 hover:bg-muted mr-2">
                  <Heart size={16} className="text-destructive"/> Wishlist
              </Link>
              <button onClick={() => navigate("/login")} className="px-5 py-2 font-semibold text-sm hover:bg-muted rounded-full transition-colors">Log In</button>
              <button onClick={() => navigate("/signup")} className="bg-primary text-primary-foreground px-5 py-2 rounded-full font-semibold text-sm hover:opacity-90 shadow-sm">Sign Up</button>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="text-center py-24 px-4 bg-gradient-to-b from-primary/5 to-background border-b relative overflow-hidden">
          {/* Decorative shapes behind search */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto space-y-6 z-10 relative">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              The <span className="text-primary">Hyperlocal</span> Advantage
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto">
              Find exact products nearby. Or run your supermarket with advanced camera scanning POS.
            </p>
            
            <div className="pt-8">
              <GlobalSearch />
            </div>

            <div className="pt-12 flex justify-center gap-4 border-t border-border mt-12 w-3/4 mx-auto">
               {!user && (
                 <button onClick={() => navigate("/signup")} className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                   Start as a Store Owner
                 </button>
               )}
            </div>
          </div>
        </section>

        <NearbyStores />
      </main>
    </div>
  );
}
