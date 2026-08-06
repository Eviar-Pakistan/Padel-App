export default function MobileLayout({ children }) {
  return (
    <div className="min-h-dvh flex justify-center px-4 py-6 sm:py-8 bg-[#4b4d5f]">
      <div className="flex w-full max-w-[390px] min-h-[calc(100dvh-3rem)] sm:min-h-[calc(100dvh-4rem)] flex-col rounded-[36px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.35)] border border-white/10 bg-[var(--color-background)]">
        {children}
      </div>
    </div>
  );
}