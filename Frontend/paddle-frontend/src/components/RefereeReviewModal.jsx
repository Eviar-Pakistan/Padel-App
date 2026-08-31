import { useState } from "react";
import { FaStar, FaTimes, FaUserCheck } from "react-icons/fa";

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  const apiBase = import.meta.env.VITE_API_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

export default function RefereeReviewModal({
  open,
  referee,
  matchTitle,
  onClose,
  onSubmit,
  submitting,
  error,
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  if (!open) return null;

  const name = referee?.fullName || "Referee";
  const image = mediaUrl(referee?.profileImage);

  const submit = (e) => {
    e.preventDefault();
    onSubmit?.({
      rating: Number(rating),
      comment: comment.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[var(--color-surface)] p-4 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">Review referee</h3>
            <p className="truncate text-xs text-white/45">
              {matchTitle || "Match"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/50 hover:bg-white/10"
            aria-label="Close"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0e1821] px-3 py-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[var(--color-primary)]">
            {image ? (
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <FaUserCheck className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="text-[11px] text-white/40">
              Rate the referee for this match
            </p>
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
          Rating
        </p>
        <div className="mb-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                n <= rating
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                  : "border-white/15 text-white/35"
              }`}
              aria-label={`${n} stars`}
            >
              <FaStar className="h-4 w-4" />
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/40">
          Message
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="How was the refereeing?"
          className="w-full resize-none rounded-xl border border-white/10 bg-[#0e1821] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-[var(--color-primary)]/50"
        />

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white"
          >
            Later
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-bold text-[var(--color-background)] disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Submit review"}
          </button>
        </div>
      </form>
    </div>
  );
}
