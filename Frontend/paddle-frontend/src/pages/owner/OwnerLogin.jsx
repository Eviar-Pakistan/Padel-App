import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBuilding, FaLock } from "react-icons/fa";
import AuthInput from "../../components/AuthInput";
import { ownerLogin } from "../../api/owner";

export default function OwnerLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await ownerLogin({
        username: username.trim(),
        password,
      });
      const token = data?.access_token || data?.accessToken;
      if (!token) {
        setError("Login succeeded but no access token was returned.");
        return;
      }
      localStorage.setItem("ownerAccessToken", token);
      navigate("/owner/dashboard");
    } catch (err) {
      const message = err.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Owner login failed. Please try again."
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
            <FaBuilding className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Paddle Owner
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Sign in to manage your club
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-[var(--color-surface)] p-6 shadow-xl md:p-8"
        >
          <div className="flex flex-col gap-5">
            <AuthInput
              label="Username"
              icon={FaBuilding}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Organization username"
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
            {error && (
              <p className="rounded-xl bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-full bg-[var(--color-secondary)] py-3.5 text-base font-bold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
