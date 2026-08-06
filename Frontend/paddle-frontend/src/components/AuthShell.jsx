import paddleLogo from "../assets/images/padel_logo.png";

export default function AuthShell({ children }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-[var(--color-background)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[45%] blur-3xl"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--color-primary) 38%, transparent) 0%, transparent 34%)",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center pt-10 pb-4">
        <img src={paddleLogo} alt="Paddle" className="h-20" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col px-6 pb-10 mt-7">
        {children}
      </div>
    </div>
  );
}
