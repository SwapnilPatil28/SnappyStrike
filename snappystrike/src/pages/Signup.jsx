import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Store, User } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer"); // default role
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password, role);
      toast.success("Account created successfully!");
      if (role === "seller") {
        navigate("/seller/setup");
      } else {
        navigate("/");
      }
    } catch (error) {
      toast.error("Failed to create account: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-sm p-8">
        <h2 className="text-3xl font-bold text-center mb-6 text-foreground">Join SnappyStrike</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full p-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div className="pt-2">
            <label className="block text-sm font-medium mb-3">I am a...</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`flex flex-col items-center justify-center p-4 border rounded-lg transition-all ${
                  role === "buyer" ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted"
                }`}
              >
                <User size={24} className="mb-2" />
                <span className="font-medium">Customer</span>
              </button>
              
              <button
                type="button"
                onClick={() => setRole("seller")}
                className={`flex flex-col items-center justify-center p-4 border rounded-lg transition-all ${
                  role === "seller" ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted"
                }`}
              >
                <Store size={24} className="mb-2" />
                <span className="font-medium">Store Owner</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground p-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50 mt-6"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
