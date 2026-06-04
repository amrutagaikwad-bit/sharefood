import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const emptyForm = { name: "", email: "", password: "", role: "RECEIVER", phone: "" };

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const email = form.email.trim().toLowerCase();
      if (isRegister) {
        await register({ ...form, email });
      } else {
        await login({ email, password: form.password });
      }
      navigate("/dashboard");
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (!err?.response) {
        setError("Cannot reach API. Run backend on port 5000 (npm run setup, then npm run dev).");
      } else {
        setError(msg || "Authentication failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsRegister((v) => !v);
    setError("");
    setForm(emptyForm);
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <form className="glass fade-in space-y-3 p-6" onSubmit={submit}>
        <h2 className="text-2xl font-bold text-primary">{isRegister ? "Join FoodBridge" : "Welcome Back"}</h2>
        <p className="text-sm text-slate-600">Connect surplus food with people who need it.</p>

        {isRegister && (
          <input
            className="input-field"
            placeholder="Full name"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        )}
        <input
          className="input-field"
          type="email"
          placeholder="Email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <input
          className="input-field"
          type="password"
          placeholder="Password (min 6 characters)"
          required
          minLength={6}
          autoComplete={isRegister ? "new-password" : "current-password"}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
        />
        {isRegister && (
          <>
            <input
              className="input-field"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
            <select className="input-field" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="DONOR">I want to donate food</option>
              <option value="RECEIVER">I need food / NGO / Shelter</option>
            </select>
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Please wait..." : isRegister ? "Create Account" : "Login"}
        </button>
        <button type="button" className="w-full text-sm text-primary" onClick={toggleMode}>
          {isRegister ? "Already have an account? Login" : "New here? Create account"}
        </button>
        <p className="text-center text-xs text-slate-500">Demo admin: admin@foodbridge.com / password123</p>
      </form>
    </div>
  );
}
