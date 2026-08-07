import { useState } from "react";
import {
  FaBuilding,
  FaUser,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaLock,
} from "react-icons/fa";
import AuthInput from "../../components/AuthInput";
import { createOrganization } from "../../api/admin";

const initialForm = {
  organizationName: "",
  username: "",
  location: "",
  number: "",
  password: "",
};

export default function CreateOrganizationPanel({ onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data } = await createOrganization({
        organizationName: form.organizationName.trim(),
        username: form.username.trim(),
        location: form.location.trim(),
        number: form.number.trim(),
        password: form.password,
      });

      setSuccess(data?.message || "Organization created successfully.");
      setForm(initialForm);
      onCreated?.();
    } catch (err) {
      const message = err.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Failed to create organization."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">
          Create Organization
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Register a new paddle owner organization
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-4 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-5 md:p-6"
      >
        <AuthInput
          label="Organization name"
          icon={FaBuilding}
          value={form.organizationName}
          onChange={updateField("organizationName")}
          placeholder="City Paddle Club"
          required
        />
        <AuthInput
          label="Username"
          icon={FaUser}
          value={form.username}
          onChange={updateField("username")}
          placeholder="clubowner1"
          required
        />
        <AuthInput
          label="Location"
          icon={FaMapMarkerAlt}
          value={form.location}
          onChange={updateField("location")}
          placeholder="Karachi"
          required
        />
        <AuthInput
          label="Contact number"
          icon={FaPhoneAlt}
          value={form.number}
          onChange={updateField("number")}
          placeholder="03001234567"
          required
        />
        <AuthInput
          label="Password"
          icon={FaLock}
          type="password"
          value={form.password}
          onChange={updateField("password")}
          placeholder="Min 6 characters"
          required
          minLength={6}
        />

        {error && (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--color-primary)] py-3.5 text-base font-bold text-[var(--color-background)] transition hover:brightness-95 disabled:opacity-60 md:w-auto md:px-8"
        >
          {loading ? "Creating..." : "Create organization"}
        </button>
      </form>
    </div>
  );
}
