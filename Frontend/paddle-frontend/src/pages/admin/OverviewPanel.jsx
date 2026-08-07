import { useEffect, useState } from "react";
import { listOrganizations } from "../../api/admin";

export default function OverviewPanel() {
  const [total, setTotal] = useState(0);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await listOrganizations();
        if (!active) return;
        setTotal(data?.total ?? 0);
        setOrganizations(data?.organizations ?? []);
      } catch (err) {
        if (!active) return;
        const message = err.response?.data?.message;
        setError(
          Array.isArray(message)
            ? message.join(", ")
            : message || "Failed to load organizations."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-[var(--color-muted)]">Loading overview...</p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">Overview</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Registered paddle owner organizations
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-5 md:p-6">
        <p className="text-sm text-[var(--color-muted)]">
          Total registered organizations
        </p>
        <p className="mt-2 text-4xl font-bold text-[var(--color-primary)]">
          {total}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)]">
        <div className="border-b border-white/10 px-4 py-3 md:px-5">
          <h3 className="text-sm font-semibold text-white">Organizations</h3>
        </div>

        {organizations.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)] md:px-5">
            No organizations yet. Create one from the sidebar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/20 text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium md:px-5">Organization</th>
                  <th className="px-4 py-3 font-medium md:px-5">Username</th>
                  <th className="px-4 py-3 font-medium md:px-5">Location</th>
                  <th className="px-4 py-3 font-medium md:px-5">Number</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="border-t border-white/5 text-white/90"
                  >
                    <td className="px-4 py-3 md:px-5">{org.organizationName}</td>
                    <td className="px-4 py-3 md:px-5">{org.username}</td>
                    <td className="px-4 py-3 md:px-5">{org.location}</td>
                    <td className="px-4 py-3 md:px-5">{org.number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
