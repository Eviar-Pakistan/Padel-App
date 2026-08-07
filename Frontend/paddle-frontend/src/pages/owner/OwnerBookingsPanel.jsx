import { useEffect, useState } from "react";
import { getStoreBookings, updateBookingStatus } from "../../api/owner";

const statuses = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];

export default function OwnerBookingsPanel() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getStoreBookings();
      setBookings(data || []);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onStatusChange = async (id, status) => {
    try {
      await updateBookingStatus(id, { status });
      await load();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : msg || "Status update failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white md:text-2xl">Bookings</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Court bookings by users
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No bookings yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/20 text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Court</th>
                  <th className="px-4 py-3 font-medium">Slot</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-white/5 text-white/90">
                    <td className="px-4 py-3">
                      <div>{b.user?.fullName}</div>
                      <div className="text-xs text-[var(--color-muted)]">
                        {b.user?.mobileNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3">{b.court?.name}</td>
                    <td className="px-4 py-3">
                      {b.timeSlot?.startTime} - {b.timeSlot?.endTime}
                    </td>
                    <td className="px-4 py-3">{String(b.bookingDate).slice(0, 10)}</td>
                    <td className="px-4 py-3">PKR {String(b.totalPrice)}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-lg border border-white/10 bg-[#0e1821] px-2 py-1.5 text-xs text-white"
                        value={b.status}
                        onChange={(e) => onStatusChange(b.id, e.target.value)}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
