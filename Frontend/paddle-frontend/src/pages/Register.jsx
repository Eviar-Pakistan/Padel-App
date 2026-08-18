import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaPhoneAlt, FaLock, FaCheck, FaIdCard } from "react-icons/fa";
import AuthShell from "../components/AuthShell";
import AuthInput from "../components/AuthInput";
import { register } from "../api/auth";
import {
  formatCnic,
  isCnicComplete,
  sanitizeFullName,
  sanitizePhone,
} from "../utils/authFields";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    cnic: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isPhoneValid = /^03\d{9}$/.test(form.phone.replace(/[\s-]/g, ""));

  const updateField = (field) => (e) => {
    let value = e.target.value;
    if (field === "fullName") value = sanitizeFullName(value);
    if (field === "cnic") value = formatCnic(value);
    if (field === "phone") value = sanitizePhone(value);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim() || !form.cnic.trim()) {
      setError("Please fill in all personal info fields.");
      return;
    }

    if (!isCnicComplete(form.cnic)) {
      setError("Please enter a valid CNIC (XXXXX-XXXXXXX-X).");
      return;
    }

    setStep(2);
  };

  const handleBack = () => {
    setError("");
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register({
        fullName: String(form.fullName.trim()),
        mobileNumber: String(form.phone.replace(/[\s-]/g, "")),
        cnicNumber: String(form.cnic.trim()),
        password: String(form.password),
      });

      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
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
        <div className="flex flex-1 flex-col rounded-[calc(1.5rem-1px)] bg-[var(--color-background)] px-5 pb-6 pt-10">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white">
              Join the Court Community
            </h1>
            <p className="mt-2 text-sm font-medium text-[var(--color-primary)]">
              {step === 1
                ? "Step 1 · Personal info"
                : "Step 2 · Account details"}
            </p>
          </div>

          <div className="mb-8 flex items-center justify-center gap-2">
            <span
              className={`h-1.5 w-10 rounded-full transition ${
                step === 1
                  ? "bg-[var(--color-primary)]"
                  : "bg-[var(--color-primary)]/40"
              }`}
            />
            <span
              className={`h-1.5 w-10 rounded-full transition ${
                step === 2
                  ? "bg-[var(--color-primary)]"
                  : "bg-white/15"
              }`}
            />
          </div>

          {step === 1 ? (
            <form
              onSubmit={handleNext}
              className="flex flex-1 flex-col gap-5"
            >
              <AuthInput
                label="Full Name"
                icon={FaUser}
                type="text"
                inputMode="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={updateField("fullName")}
                required
              />

              <AuthInput
                label="CNIC Number"
                icon={FaIdCard}
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                maxLength={15}
                placeholder="XXXXX-XXXXXXX-X"
                hint="Example: 42101-1234567-1"
                value={form.cnic}
                onChange={updateField("cnic")}
                required
              />

              {error && (
                <p className="text-center text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                className="mt-2 w-full rounded-full bg-[var(--color-secondary)] py-3.5 text-base font-bold text-white transition hover:brightness-95"
              >
                Continue
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col gap-5"
            >
              <AuthInput
                label="Mobile Number"
                icon={FaPhoneAlt}
                rightIcon={isPhoneValid ? FaCheck : undefined}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                placeholder="03XXXXXXXXX"
                value={form.phone}
                onChange={updateField("phone")}
                required
              />

              <AuthInput
                label="Password"
                icon={FaLock}
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={updateField("password")}
                required
              />

              {error && (
                <p className="text-center text-sm text-red-400">{error}</p>
              )}

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full rounded-full border border-white/20 py-3.5 text-base font-bold text-white transition hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[var(--color-secondary)] py-3.5 text-base font-bold text-white transition hover:brightness-95 disabled:opacity-60"
                >
                  {loading ? "Registering..." : "Register Now"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-[var(--color-primary)] underline underline-offset-2"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
