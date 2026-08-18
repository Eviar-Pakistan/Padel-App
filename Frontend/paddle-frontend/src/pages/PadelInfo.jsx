import { useNavigate } from "react-router-dom";
import {
  FaClipboardList,
  FaClock,
  FaHandshake,
  FaStar,
} from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import knowledgeBanner from "../assets/images/padel_knowledge_banner.png";
import etiquetteBanner from "../assets/images/padel_etiquette_banner.png";
import beginnerBanner from "../assets/images/padel_beginner_banner.png";

const QUICK_LINKS = [
  { id: "knowledge", label: "Rules of Padel", icon: FaClipboardList },
  { id: "scoring", label: "Scoring Guide", icon: FaClock },
  { id: "etiquette", label: "Court Etiquette", icon: FaHandshake },
  { id: "beginner", label: "Beginner Tips", icon: FaStar },
];

const SCORE_STEPS = [
  { points: "15", label: "Love" },
  { points: "30", label: "Thirty" },
  { points: "40", label: "Forty" },
  { points: "Game", label: "Win the game", highlight: true },
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function PadelInfo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md space-y-6 px-4 pb-28 pt-20">
        <header>
          <h1 className="text-2xl font-bold text-white">Padel Info</h1>
          <p className="mt-1 text-sm text-white/50">
            Learn the game. Play with confidence.
          </p>
        </header>

        <section id="knowledge" className="scroll-mt-20 overflow-hidden rounded-2xl">
          <img
            src={knowledgeBanner}
            alt="Knowledge is your advantage. Understand. Improve. Enjoy Padel."
            className="h-auto w-full object-cover"
          />
        </section>

        <section className="grid grid-cols-4 gap-2">
          {QUICK_LINKS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToId(id)}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[var(--color-surface)] px-1.5 py-2 text-center"
            >
              <Icon className="h-5 w-5 text-[var(--color-primary)]" />
              <span className="text-[10px] font-medium leading-tight text-white">
                {label}
              </span>
            </button>
          ))}
        </section>

        <section id="scoring" className="scroll-mt-20 space-y-3">
          <div>
            <h2 className="text-lg font-bold text-white">How Scoring Works</h2>
            <p className="mt-1 text-sm text-white/50">
              Padel uses the same scoring system as tennis.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SCORE_STEPS.map((step) => (
              <div
                key={step.points}
                className="rounded-xl border border-white/10 bg-[var(--color-surface)] px-1.5 py-3 text-center"
              >
                <p
                  className={`text-base font-bold ${
                    step.highlight
                      ? "text-[var(--color-primary)]"
                      : "text-white"
                  }`}
                >
                  {step.points}
                </p>
                <p className="mt-1 text-[10px] leading-tight text-white/50">
                  {step.label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-white/45">
            6 games to win a set (win by 2). Best of 3 sets.
          </p>
        </section>

        <section id="etiquette" className="scroll-mt-20 overflow-hidden rounded-2xl">
          <img
            src={etiquetteBanner}
            alt="Court etiquette: be respectful, wait your turn, and keep the court clean."
            className="h-auto w-full object-cover"
          />
        </section>

        <section id="beginner" className="scroll-mt-20 overflow-hidden rounded-2xl">
          <img
            src={beginnerBanner}
            alt="Beginner basics: use the walls, stay ready, communicate, and keep practicing."
            className="h-auto w-full object-cover"
          />
        </section>
      </main>

      <BottomNav
        onChange={(id) => {
          if (id === "home") navigate("/");
          else if (id === "profile") navigate("/profile");
          else navigate(`/${id}`);
        }}
      />
    </div>
  );
}
