import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaPhoneAlt, FaLock, FaCheck } from "react-icons/fa";
import AuthShell from "../components/AuthShell";
import AuthInput from "../components/AuthInput";
import { login } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isPhoneValid = /^03\d{9}$/.test(phone.replace(/[\s-]/g, ""));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await login({
        mobileNumber: String(phone.replace(/[\s-]/g, "")),
        password: String(password),
      });

      const token = data?.access_token || data?.accessToken;

      if (token) {
        localStorage.setItem("accessToken", token);
        navigate("/");
      } else {
        setError("Login succeeded but no access token was returned.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div
        className="flex flex-1 flex-col rounded-3xl p-px"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 55%, white 20%) 0%, color-mix(in srgb, var(--color-primary) 25%, transparent) 45%, transparent 100%)",
        }}
      >
        <div className="flex flex-1 flex-col rounded-[calc(1.5rem-1px)] bg-[var(--color-background)] px-5 pb-6 pt-10 ">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
            <p className="mt-2 text-sm font-medium text-[var(--color-primary)]">
              Login to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
            <AuthInput
              label="Mobile Number"
              icon={FaPhoneAlt}
              rightIcon={isPhoneValid ? FaCheck : undefined}
              type="tel"
              inputMode="numeric"
              placeholder="03XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <AuthInput
              label="Password"
              icon={FaLock}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <p className="text-center text-sm text-red-400">{error}</p>
            )}

            

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-[var(--color-primary)] py-3.5 text-base font-bold text-[var(--color-background)] transition hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold underline underline-offset-2 text-[var(--color-primary)]"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
