import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaClipboardCheck, FaEnvelope, FaLock } from "react-icons/fa";
import AuthInput from "../../components/AuthInput";
import { refereeLogin, refereeRegister } from "../../api/referee";

export default function RefereeRegister() {
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
      const emailValue = email.trim().toLowerCase();
      await refereeRegister({
        email: emailValue,
        password,
      });
      const { data } = await refereeLogin({
        email: emailValue,
        password,
      });
      const token = data?.access_token || data?.accessToken;
      if (!token) {
        navigate("/referee/login");
        return;
      }
      localStorage.setItem("refereeAccessToken", token);
      if (data.referee) {
        localStorage.setItem("refereeProfile", JSON.stringify(data.referee));
      }
      navigate("/referee", { state: { tab: "profile" } });
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Registration failed."
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
            <FaClipboardCheck className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Referee Register</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Sign up with email and password. You can finish your profile after
            you log in.
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
              placeholder="referee@email.com"
              required
              autoComplete="email"
            />
            <AuthInput
              label="Password"
              icon={FaLock}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={4}
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
            <p className="text-center text-sm text-white/45">
              Already registered?{" "}
              <Link
                to="/referee/login"
                className="font-semibold text-[var(--color-primary)]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
