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
      <form className="card space-y-3" onSubmit={submit}>
        <h2 className="text-2xl font-semibold">{isRegister ? "Create Account" : "Welcome Back"}</h2>
        {isRegister && (
          <input
            className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            placeholder="Name"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        )}
        <input
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          type="email"
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          type="password"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {isRegister && (
          <>
            <input
              className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
              placeholder="Phone (optional)"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <select
              className="w-full rounded-xl border border-green-200 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="DONOR">Donor</option>
              <option value="RECEIVER">Receiver</option>
            </select>
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full">{isRegister ? "Register" : "Login"}</button>
        <button type="button" className="w-full text-sm text-primary" onClick={() => setIsRegister((v) => !v)}>
          {isRegister ? "Already have an account?" : "Create a new account"}
        </button>
      </form>
    </div>
  );
}

