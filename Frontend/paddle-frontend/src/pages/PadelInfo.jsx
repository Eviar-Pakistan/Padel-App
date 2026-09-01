import { useNavigate } from "react-router-dom";
import {
  FaBookOpen,
  FaClipboardList,
  FaFlag,
  FaGlobe,
  FaHandshake,
  FaLightbulb,
} from "react-icons/fa";
import TopNav from "../components/TopNav";
import BottomNav from "../components/BottomNav";
import knowledgeBanner from "../assets/images/padel_knowledge_banner.png";
import etiquetteBanner from "../assets/images/padel_etiquette_banner.png";
import beginnerBanner from "../assets/images/padel_beginner_banner.png";

const QUICK_LINKS = [
  { id: "intro", label: "What is Padel", icon: FaBookOpen },
  { id: "world", label: "World History", icon: FaGlobe },
  { id: "pakistan", label: "Pakistan", icon: FaFlag },
  { id: "rules", label: "Rules", icon: FaClipboardList },
  { id: "tips", label: "Tips & Tricks", icon: FaLightbulb },
  { id: "etiquette", label: "Etiquette", icon: FaHandshake },
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function SectionCard({ id, title, children }) {
  return (
    <section
      id={id}
      className="scroll-mt-20 space-y-3 rounded-2xl border border-white/10 bg-[var(--color-surface)] p-4"
    >
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed text-white/75">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Callout({ children }) {
  return (
    <p className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2.5 text-sm leading-relaxed text-[var(--color-primary)]">
      {children}
    </p>
  );
}

export default function PadelInfo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[var(--color-background)]">
      <TopNav />

      <main className="mx-auto w-full max-w-md space-y-5 px-4 pb-28 pt-20">
        <header>
          <h1 className="text-2xl font-bold text-white">Padel Guide</h1>
          <p className="mt-1 text-sm text-white/50">
            A short and student-friendly introduction to padel.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl">
          <img
            src={knowledgeBanner}
            alt="Knowledge is your advantage. Understand. Improve. Enjoy Padel."
            className="h-auto w-full object-cover"
          />
        </section>

        <div className="flex flex-wrap gap-2">
          {[
            "World History",
            "Pakistan History",
            "Rules & Regulation",
            "Tips & Tricks",
            "Sportsmanship",
          ].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/60"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="text-sm leading-relaxed text-white/65">
          This guide explains the basics of padel in simple words. It is designed
          for students who want a quick understanding of where the game came
          from, how it is played, and how to behave properly on court.
        </p>

        <section className="grid grid-cols-3 gap-2">
          {QUICK_LINKS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToId(id)}
              className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[var(--color-surface)] px-1.5 py-2 text-center"
            >
              <Icon className="h-5 w-5 text-[var(--color-primary)]" />
              <span className="text-[10px] font-medium leading-tight text-white">
                {label}
              </span>
            </button>
          ))}
        </section>

        <SectionCard id="intro" title="What is padel?">
          <p className="text-sm leading-relaxed text-white/75">
            Padel is a fun racket sport that mixes parts of tennis and squash. It
            is usually played in doubles, and the walls are part of the game.
          </p>
          <Callout>
            A good beginner rule: keep the ball in play, work with your partner,
            and enjoy the game.
          </Callout>
        </SectionCard>

        <SectionCard id="world" title="World History of Padel">
          <BulletList
            items={[
              "Padel combines parts of tennis and squash.",
              "It was invented in 1969 in Mexico by Enrique Corcuera.",
              "He built a smaller tennis-style court at his home and added walls around it.",
              "The sport became more popular in Spain and Argentina during the 1970s.",
              "Padel is usually played in doubles, with two players on each team.",
              "Unlike tennis, the walls are part of the game and the ball can bounce off them.",
              "Today, padel is one of the fastest-growing sports in the world, especially in Europe, the Middle East, and Latin America.",
            ]}
          />
          <Callout>
            In simple words: Padel started as a fun home game in Mexico and later
            became an international sport enjoyed by millions of people.
          </Callout>
        </SectionCard>

        <SectionCard id="pakistan" title="Padel History in Pakistan">
          <BulletList
            items={[
              "Padel is a relatively new sport in Pakistan, but it is growing quickly.",
              "It started getting attention in Pakistan in the early 2020s.",
              "The first dedicated padel courts began appearing in major cities like Karachi, Lahore, and Islamabad.",
              "The sport became popular among young people, athletes, and recreational players.",
              "More clubs, private courts, and local tournaments have started appearing in different cities.",
              "Social media and international sports trends have also helped padel grow in Pakistan.",
              "Today, padel is becoming one of the fastest-growing new sports in the country.",
            ]}
          />
          <Callout>
            In simple words: Padel is still new in Pakistan, but more people are
            discovering it every year and the sport is becoming more popular.
          </Callout>
        </SectionCard>

        <section className="overflow-hidden rounded-2xl">
          <img
            src={beginnerBanner}
            alt="Beginner basics: use the walls, stay ready, communicate, and keep practicing."
            className="h-auto w-full object-cover"
          />
        </section>

        <SectionCard id="rules" title="Rules & Regulation">
          <p className="text-sm text-white/55">
            Basic rules of padel in very simple words:
          </p>
          <BulletList
            items={[
              "Padel is usually played 2 vs 2.",
              "The game starts with an underarm serve.",
              "The serve must bounce once before being hit.",
              "The ball must land in the opposite service box.",
              "After the serve, players can hit the ball before or after one bounce.",
              "The ball can bounce off the glass walls and still remain in play.",
              "If the ball bounces twice on the ground, the point is lost.",
              "Players cannot hit the ball directly into their own wall first.",
              "Scoring is the same as tennis: 15, 30, 40, Game.",
              "A set is usually won by the first team to reach 6 games with a 2-game lead.",
            ]}
          />
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { points: "15", label: "Fifteen" },
              { points: "30", label: "Thirty" },
              { points: "40", label: "Forty" },
              { points: "Game", label: "Win the game", highlight: true },
            ].map((step) => (
              <div
                key={step.points}
                className="rounded-xl border border-white/10 bg-[#0e1821] px-1.5 py-3 text-center"
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
          <Callout>
            Easy way to remember: Serve underarm, keep the ball in play, use the
            walls, and do not let the ball bounce twice.
          </Callout>
        </SectionCard>

        <SectionCard id="tips" title="Tips & Tricks">
          <p className="text-sm text-white/55">
            These simple tips can help new players improve faster:
          </p>
          <BulletList
            items={[
              "Focus on control, not power. Accurate shots are often better than very hard shots.",
              "Stay active on your feet. Keep moving and be ready for the next ball.",
              "Play close to your partner. Teamwork is very important in padel.",
              "Use the walls. Learn how the ball rebounds instead of avoiding the glass.",
              "Move towards the net when you get the chance. It is a strong attacking position.",
              "Aim for open spaces instead of hitting straight at your opponents.",
              "Use lobs to push opponents away from the net.",
              "Keep your shots low so they are harder to return.",
              "Practice your serve and return regularly.",
              "Be patient. Do not try to win every point with one difficult shot.",
            ]}
          />
          <Callout>
            Best way to improve: Play regularly, practice your control and
            positioning, and communicate well with your partner.
          </Callout>
        </SectionCard>

        <section className="overflow-hidden rounded-2xl">
          <img
            src={etiquetteBanner}
            alt="Court etiquette: be respectful, wait your turn, and keep the court clean."
            className="h-auto w-full object-cover"
          />
        </section>

        <SectionCard id="etiquette" title="Sportsmanship & Court Etiquette">
          <p className="text-sm text-white/55">
            Good behavior on and off the court is an important part of the game.
          </p>
          <BulletList
            items={[
              "Respect your partner, opponents, coaches, and referees at all times.",
              "Greet players before the match and thank them afterwards.",
              "Listen to your coach and follow instructions during training.",
              "Respect the referee’s decisions and avoid unnecessary arguments.",
              "If you disagree with a call, ask politely instead of reacting aggressively.",
              "Be honest with scores and line calls.",
              "Do not distract players while a point is being played.",
              "Wait until the point is over before entering or crossing a court.",
              "Return balls safely to other players.",
              "Arrive on time for matches, coaching sessions, and court bookings.",
              "Take care of rackets, nets, glass walls, and other equipment.",
              "Keep the court and surrounding facilities clean.",
              "Use changing rooms, seating areas, and other club facilities responsibly.",
              "Do not damage or misuse club property.",
              "Celebrate respectfully without mocking opponents.",
              "Follow club safety rules and report damaged equipment or unsafe areas to staff.",
            ]}
          />
          <Callout>
            Most important message: Play fair, respect everyone, take care of the
            facilities, and enjoy the game.
          </Callout>
        </SectionCard>
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
