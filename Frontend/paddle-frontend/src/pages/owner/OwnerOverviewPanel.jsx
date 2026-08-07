import { useEffect, useState } from "react";
import { ownerOverview } from "../../api/owner";

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4 md:p-5">
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--color-primary)]">{value}</p>
    </div>
  );
}

export default function OwnerOverviewPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await ownerOverview();
        if (active) setData(res.data);
      } catch (err) {
        const message = err.response?.data?.message;
        if (active) {
          setError(
            Array.isArray(message)
              ? message.join(", ")
              : message || "Failed to load overview."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-sm text-[var(--color-muted)]">Loading overview...</p>;
  if (error) {
    return <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">Overview</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Club performance at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total courts" value={data.totalCourts} />
        <StatCard label="Bookings today" value={data.todayBookings} />
        <StatCard label="Booking history" value={data.totalBookings} />
        <StatCard label="Total coaches" value={data.totalCoaches} />
        <StatCard label="Total products" value={data.totalProducts} />
        <StatCard label="Total orders" value={data.totalOrders} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)]">
        <div className="border-b border-white/10 px-4 py-3 md:px-5">
          <h3 className="text-sm font-semibold text-white">Recent bookings</h3>
        </div>
        {data.recentBookings?.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
            No bookings yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/20 text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Court</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Slot</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.map((b) => (
                  <tr key={b.id} className="border-t border-white/5 text-white/90">
                    <td className="px-4 py-3">{b.court?.name}</td>
                    <td className="px-4 py-3">{b.user?.fullName}</td>
                    <td className="px-4 py-3">
                      {b.timeSlot?.startTime} - {b.timeSlot?.endTime}
                    </td>
                    <td className="px-4 py-3">
                      {String(b.bookingDate).slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">{b.status}</td>
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
