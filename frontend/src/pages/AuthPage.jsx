import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "RECEIVER", phone: "" });
  const [error, setError] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <form className="glass fade-in space-y-3 p-6" onSubmit={submit}>
        <h2 className="text-2xl font-bold text-primary">{isRegister ? "Join FoodBridge" : "Welcome Back"}</h2>
        <p className="text-sm text-slate-600">Connect surplus food with people who need it.</p>

        {isRegister && (
          <input className="input-field" placeholder="Full name" required onChange={(e) => setForm({ ...form, name: e.target.value })} />
        )}
        <input className="input-field" type="email" placeholder="Email" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input-field" type="password" placeholder="Password" required onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {isRegister && (
          <>
            <input className="input-field" placeholder="Phone (optional)" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select className="input-field" onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="DONOR">I want to donate food</option>
              <option value="RECEIVER">I need food / NGO / Shelter</option>
            </select>
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full">{isRegister ? "Create Account" : "Login"}</button>
        <button type="button" className="w-full text-sm text-primary" onClick={() => setIsRegister((v) => !v)}>
          {isRegister ? "Already have an account? Login" : "New here? Create account"}
        </button>
        <p className="text-center text-xs text-slate-500">Admin: admin@foodbridge.com / password123</p>
      </form>
    </div>
  );
}
