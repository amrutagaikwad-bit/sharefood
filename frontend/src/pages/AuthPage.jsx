import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL, isApiConfigured } from "../config/env.js";

const emptyForm = { name: "", email: "", password: "", role: "RECEIVER", phone: "" };

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, register, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const sendOtp = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email) return setError("Enter your email first");
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/auth/otp/send", {
        email,
        purpose: isRegister ? "register" : "login"
      });
      setOtpSent(true);
      setOtpHint(res.data.message);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const email = form.email.trim().toLowerCase();
      if (useOtp) {
        if (!otpSent) {
          await sendOtp();
          return;
        }
        await loginWithOtp({
          email,
          code: otpCode,
          purpose: isRegister ? "register" : "login",
          name: form.name,
          role: form.role,
          phone: form.phone
        });
      } else if (isRegister) {
        await register({ ...form, email });
      } else {
        await login({ email, password: form.password });
      }
      navigate("/dashboard");
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (!err?.response) {
        if (!isApiConfigured()) {
          setError(
            "API URL is not configured. Set VITE_API_URL in Netlify environment variables and redeploy."
          );
        } else if (import.meta.env.DEV) {
          setError("Cannot reach API. From sharefood folder run: npm run setup, then npm run dev");
        } else {
          setError(
            `Cannot reach API at ${API_BASE_URL}. Check that the Render backend is running and CORS allows this site.`
          );
        }
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
    setOtpSent(false);
    setOtpCode("");
    setForm(emptyForm);
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <form className="glass fade-in space-y-3 p-6" onSubmit={submit}>
        <h2 className="text-2xl font-bold text-primary">{isRegister ? "Join FoodBridge" : "Welcome Back"}</h2>
        <p className="text-sm text-slate-600">Connect surplus food with people who need it.</p>

        <div className="flex gap-2">
          <button
            type="button"
            className={!useOtp ? "btn-primary flex-1 text-sm" : "btn-secondary flex-1 text-sm"}
            onClick={() => { setUseOtp(false); setOtpSent(false); }}
          >
            Password
          </button>
          <button
            type="button"
            className={useOtp ? "btn-primary flex-1 text-sm" : "btn-secondary flex-1 text-sm"}
            onClick={() => { setUseOtp(true); setOtpSent(false); }}
          >
            Email OTP
          </button>
        </div>

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

        {!useOtp && (
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
        )}

        {useOtp && otpSent && (
          <>
            <p className="text-sm text-green-700 dark:text-green-400">{otpHint}</p>
            <input
              className="input-field"
              placeholder="6-digit code"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            />
            <button type="button" className="text-sm text-primary underline" onClick={sendOtp} disabled={submitting}>
              Resend code
            </button>
          </>
        )}

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
          {submitting
            ? "Please wait..."
            : useOtp
              ? otpSent
                ? isRegister
                  ? "Verify & Create Account"
                  : "Verify & Login"
                : "Send OTP"
              : isRegister
                ? "Create Account"
                : "Login"}
        </button>
        <button type="button" className="w-full text-sm text-primary" onClick={toggleMode}>
          {isRegister ? "Already have an account? Login" : "New here? Create account"}
        </button>
        <p className="text-center text-xs text-slate-500">Demo admin: admin@foodbridge.com / password123</p>
      </form>
    </div>
  );
}
