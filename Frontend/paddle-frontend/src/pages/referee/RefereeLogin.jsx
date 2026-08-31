import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaClipboardCheck, FaLock, FaPhone } from "react-icons/fa";
import AuthInput from "../../components/AuthInput";
import { refereeLogin } from "../../api/referee";
import { sanitizePhone } from "../../utils/authFields";

export default function RefereeLogin() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await refereeLogin({
        phoneNumber: phoneNumber.trim(),
        password,
      });
      const token = data?.access_token || data?.accessToken;
      if (!token) {
        setError("Login succeeded but no access token was returned.");
        return;
      }
      localStorage.setItem("refereeAccessToken", token);
      if (data.referee) {
        localStorage.setItem("refereeProfile", JSON.stringify(data.referee));
      }
      navigate("/referee");
    } catch (err) {
      const message = err.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Referee login failed."
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
          <h1 className="text-2xl font-bold text-white">Referee Login</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Sign in with your phone number and password
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-[var(--color-surface)] p-6 shadow-xl"
        >
          <div className="flex flex-col gap-5">
            <AuthInput
              label="Phone number"
              icon={FaPhone}
              type="tel"
              inputMode="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(sanitizePhone(e.target.value))}
              placeholder="03XXXXXXXXX"
              required
              autoComplete="tel"
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
            <p className="text-center text-sm text-white/45">
              New referee?{" "}
              <Link
                to="/referee/register"
                className="font-semibold text-[var(--color-primary)]"
              >
                Create an account
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
