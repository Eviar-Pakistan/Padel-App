import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaUserTie } from "react-icons/fa";
import AuthInput from "../../components/AuthInput";
import { coachLogin } from "../../api/coach";

export default function CoachLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await coachLogin({
        email: email.trim(),
        password,
      });
      const token = data?.access_token || data?.accessToken;
      if (!token) {
        setError("Login succeeded but no access token was returned.");
        return;
      }
      localStorage.setItem("coachAccessToken", token);
      if (data.coach) {
        localStorage.setItem("coachProfile", JSON.stringify(data.coach));
      }
      navigate("/coach");
    } catch (err) {
      const message = err.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Coach login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/15">
            <FaUserTie className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Coach Login</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Sign in to manage bookings, profile, and chats
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-[var(--color-surface)] p-6 shadow-xl"
        >
          <div className="flex flex-col gap-5">
            <AuthInput
              label="Email"
              icon={FaEnvelope}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@email.com"
              required
              autoComplete="username"
            />
            <AuthInput
              label="Password"
              icon={FaLock}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
