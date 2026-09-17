import { useState } from "react";
import { useApp } from "../context";
import { useNavigate } from "react-router-dom";

export default function LoginModal() {
  const { login, setShowLogin} = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const account = await login(email, password);
      setShowLogin(false); navigate(account.role === "admin" ? "/admin" : "/saved");
    } catch (error) { setError(error instanceof Error ? error.message : "Sign in failed"); }
    finally { setLoading(false); }

  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowLogin(false)}>
      <div className="bg-cream w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-navy p-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-white text-2xl font-bold">Sign In</h2>
            <p className="text-white/60 text-xs mt-1">Harborstone Homes Portal</p>
          </div>
          <button onClick={() => setShowLogin(false)} className="text-white/60 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-7 space-y-5">
          <div>
            <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Email Address</label>
            <input
              type="email"
              className="w-full border border-[#ddd5c5] bg-white px-4 py-3 text-sm text-navy"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Password</label>
            <input
              type="password"
              className="w-full border border-[#ddd5c5] bg-white px-4 py-3 text-sm text-navy"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white py-3 font-semibold text-sm hover:bg-amber transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="text-center text-xs text-stone pt-2 space-y-1 bg-cream-dark p-3 border border-[#ddd5c5]">
            <div className="font-semibold text-navy mb-1">Administrator access</div>
            <div>Use the admin credentials configured for this environment.</div>
          </div>
        </form>
      </div>
    </div>
  );
}

