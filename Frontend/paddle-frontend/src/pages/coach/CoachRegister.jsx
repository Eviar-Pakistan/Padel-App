import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaLock, FaPhone, FaUserTie } from "react-icons/fa";
import AuthInput from "../../components/AuthInput";
import { coachLogin, coachRegister } from "../../api/coach";
import { sanitizePhone } from "../../utils/authFields";

export default function CoachRegister() {
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
      const phone = phoneNumber.trim();
      await coachRegister({
        phoneNumber: phone,
        password,
      });
      const { data } = await coachLogin({
        phoneNumber: phone,
        password,
      });
      const token = data?.access_token || data?.accessToken;
      if (!token) {
        navigate("/coach/login");
        return;
      }
      localStorage.setItem("coachAccessToken", token);
      if (data.coach) {
        localStorage.setItem("coachProfile", JSON.stringify(data.coach));
      }
      navigate("/coach", { state: { tab: "profile" } });
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
            <FaUserTie className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Coach Register</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Sign up with phone number and password. You can finish your profile
            after you log in.
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
                to="/coach/login"
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
