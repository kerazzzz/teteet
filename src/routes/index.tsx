import { createFileRoute, Link } from "@tanstack/react-router";
import {
  type MotionValue,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  ChevronsRight,
  CircleDollarSign,
  Globe,
  MessageCircleMore,
  Radar,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { en } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const heroLines = [
  "Verified listing intelligence",
  "Buyer-seller communication in context",
  "Payment-state clarity from start to close",
  "Confidence-first experience for Nepal",
] as const;

const chapterBlocks = [
  {
    eyebrow: "Chapter One",
    title: "Discovery should feel curated, not chaotic.",
    copy: "Titeet removes the noise with precision filtering, district-aware exploration, and a shortlist flow that helps buyers move from curiosity to conviction in one session.",
    accent: "Search by intent, not by endless scrolling.",
  },
  {
    eyebrow: "Chapter Two",
    title: "Trust should be visible before negotiations begin.",
    copy: "Each listing appears with a clearer quality lens, moderation-backed checks, and context that reduces uncertainty before messaging starts.",
    accent:
      "Confidence is engineered into the surface, not hidden behind support tickets.",
  },
  {
    eyebrow: "Chapter Three",
    title: "Transactions should feel orchestrated, not improvised.",
    copy: "From first inquiry to checkout status updates, the platform turns fragmented actions into a single, trackable flow for buyers and sellers.",
    accent: "One timeline. Fewer blind spots. Faster decisions.",
  },
] as const;

const platformBands = [
  {
    icon: ScanSearch,
    title: "Precision Discovery",
    body: "Adaptive filters align buyer budgets, vehicle preferences, and location context into a faster decision path.",
    kicker: "Intent-first search",
  },
  {
    icon: Radar,
    title: "Trust Layer",
    body: "Listing quality controls and transparent condition cues surface confidence signals before contact starts.",
    kicker: "Visibility-first quality",
  },
  {
    icon: MessageCircleMore,
    title: "Conversation Rail",
    body: "Buyer and seller communication stays anchored to the listing context so momentum is never lost.",
    kicker: "Context-preserving chat",
  },
  {
    icon: CircleDollarSign,
    title: "Transaction Core",
    body: "Integrated payment and status milestones keep deal progress legible from initiation through completion.",
    kicker: "Milestone-driven checkout",
  },
] as const;

const proofStatements = [
  "Built for Nepal's used-car decision cycle.",
  "Designed to reduce decision friction for buyers.",
  "Structured to help sellers operate like premium brands.",
] as const;

const sellerFlow = [
  "Publish inventory with better narrative control and cleaner detail depth.",
  "Handle inquiries in one workflow without losing listing context.",
  "Track payment and transaction states with less operational ambiguity.",
] as const;

const revealUp: Variants = {
  hidden: { opacity: 0, y: 42 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  },
};

const revealGroup: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
};

function HomePage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const narrativeSectionRef = useRef<HTMLElement>(null);
  const narrativePinnedRef = useRef<HTMLDivElement>(null);
  const microStoryRef = useRef<HTMLElement>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start start", "end end"],
  });
  const { scrollYProgress: microProgress } = useScroll({
    target: microStoryRef,
    offset: ["start end", "end start"],
  });

  const heroDrift = useSpring(
    useTransform(
      scrollYProgress,
      [0, 0.25],
      [0, shouldReduceMotion ? 0 : -120],
    ),
    { stiffness: 88, damping: 25, mass: 0.45 },
  );
  const haloScale = useSpring(
    useTransform(
      scrollYProgress,
      [0, 0.55],
      [1, shouldReduceMotion ? 1 : 1.34],
    ),
    { stiffness: 115, damping: 29, mass: 0.55 },
  );
  const haloRotate = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 24]),
    { stiffness: 90, damping: 23, mass: 0.62 },
  );

  const microXOne = useTransform(
    microProgress,
    [0, 0.5, 1],
    shouldReduceMotion ? [0, 0, 0] : [-80, 0, 80],
  );
  const microXTwo = useTransform(
    microProgress,
    [0, 0.5, 1],
    shouldReduceMotion ? [0, 0, 0] : [80, 0, -90],
  );
  const microXThree = useTransform(
    microProgress,
    [0, 0.5, 1],
    shouldReduceMotion ? [0, 0, 0] : [-60, 0, 72],
  );

  useEffect(() => {
    if (shouldReduceMotion || !stageRef.current) return;

    let cleanup: (() => void) | undefined;
    let mounted = true;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (!mounted || !stageRef.current) return;

      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        if (
          narrativeSectionRef.current &&
          narrativePinnedRef.current &&
          window.innerWidth >= 1024
        ) {
          ScrollTrigger.create({
            trigger: narrativeSectionRef.current,
            start: "top top+=95",
            end: "bottom bottom-=120",
            pin: narrativePinnedRef.current,
            pinSpacing: false,
            scrub: 0.9,
            anticipatePin: 1,
          });
        }

        chapterRefs.current.forEach((chapter) => {
          if (!chapter) return;
          gsap.fromTo(
            chapter,
            { opacity: 0.22, y: 78, filter: "blur(8px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              ease: "none",
              scrollTrigger: {
                trigger: chapter,
                start: "top 85%",
                end: "top 40%",
                scrub: 1,
              },
            },
          );
        });

        gsap.utils
          .toArray<HTMLElement>("[data-platform-band]")
          .forEach((band) => {
            gsap.fromTo(
              band,
              { y: 62, opacity: 0.3 },
              {
                y: 0,
                opacity: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: band,
                  start: "top 88%",
                  end: "top 48%",
                  scrub: 1,
                },
              },
            );
          });
      }, stageRef);

      cleanup = () => context.revert();
    })();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [shouldReduceMotion]);

  return (
    <main
      ref={stageRef}
      className="relative mx-auto w-full max-w-[96rem] overflow-hidden px-4 pb-28 sm:px-6 lg:px-10"
    >
      <AmbientBackdrop scale={haloScale} rotate={haloRotate} />

      <section className="relative -mt-8 min-h-[86vh] overflow-x-visible overflow-y-hidden pt-20 sm:-mt-10 sm:pt-24 lg:-mt-12 lg:pt-28">
        <motion.div
          style={{ y: heroDrift }}
          className="relative px-2 sm:px-4 lg:px-6"
        >
          <motion.div
            initial="hidden"
            animate="show"
            variants={revealGroup}
            className="mx-auto flex max-w-5xl flex-col items-center gap-10 text-center"
          >
            <motion.div variants={revealUp} className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-primary/55 via-accent/50 to-primary/45 p-[1px] shadow-[0_24px_44px_-30px_oklch(0.56_0.16_48_/_0.9)]"
              >
                <Badge className="relative inline-flex items-center gap-2 rounded-full border-0 bg-background/92 px-4 py-2 text-[0.67rem] font-semibold tracking-[0.2em] text-foreground uppercase backdrop-blur-xl">
                  <Sparkles className="size-3.5 text-primary/90" />
                  Mobility, Reimagined
                </Badge>
              </motion.div>
              <div className="space-y-6">
                <p className="font-editorial text-[1.75rem] leading-none text-primary/85 sm:text-[2rem]">
                  {en.brand.name}
                </p>
                <h1 className="mx-auto max-w-4xl text-[2.2rem] leading-[0.95] font-semibold sm:text-6xl lg:text-[5.9rem]">
                  The premium operating system for used-car commerce.
                </h1>
                <p className="mx-auto max-w-2xl text-base text-foreground/80 sm:text-lg">
                  Titeet blends marketplace utility with brand-grade
                  presentation so buyers move with more certainty and sellers
                  operate with higher credibility.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/listings">
                  <Button size="lg" className="group h-12 px-7 text-sm">
                    Browse Verified Listings
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
                <Link to="/compare">
                  <Button
                    variant="outline"
                    size="lg"
                    className="group h-12 px-7 text-sm"
                  >
                    Open Compare Studio
                    <ChevronsRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <MovingRibbon />

      <RevealSection className="mt-20 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-primary/85 uppercase">
            Brand Manifesto
          </p>
          <h2 className="max-w-4xl text-4xl leading-[1.02] font-semibold sm:text-6xl">
            Built to make high-stakes vehicle decisions feel clear, modern, and
            beautiful.
          </h2>
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            Most marketplaces optimize for listings count. Titeet optimizes for
            decision quality. The result is a calmer buyer journey and a
            stronger seller brand surface.
          </p>
        </div>
        <div className="flex flex-col justify-end gap-8 border-l border-border/70 pl-6">
          {proofStatements.map((statement) => (
            <div key={statement} className="space-y-2">
              <p className="font-display text-3xl leading-none text-primary/88">
                01
              </p>
              <p className="text-sm text-foreground/84">{statement}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      <section
        ref={narrativeSectionRef}
        className="mt-24 grid gap-10 lg:grid-cols-[0.92fr_1.08fr]"
      >
        <div
          ref={narrativePinnedRef}
          className="space-y-5 border-l-2 border-primary/35 pl-5 lg:top-24 lg:pl-6"
        >
          <p className="text-xs font-semibold tracking-[0.28em] text-primary/85 uppercase">
            Narrative Journey
          </p>
          <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">
            A cinematic long-scroll sequence for trust-building.
          </h2>
          <p className="text-base text-muted-foreground">
            Scroll to move through three deliberate stages of the buyer-seller
            experience.
          </p>
        </div>

        <div className="space-y-12">
          {chapterBlocks.map((chapter, index) => (
            <article
              key={chapter.title}
              ref={(node) => {
                chapterRefs.current[index] = node;
              }}
              className="relative border-l border-border/60 py-2 pl-6 sm:pl-8"
            >
              <div className="pointer-events-none absolute -left-3 top-2 h-3 w-3 rounded-full bg-primary/80" />
              <p className="text-xs font-semibold tracking-[0.24em] text-primary/82 uppercase">
                {chapter.eyebrow}
              </p>
              <h3 className="mt-3 text-3xl leading-tight font-semibold sm:text-4xl">
                {chapter.title}
              </h3>
              <p className="mt-3 max-w-3xl text-base text-muted-foreground sm:text-lg">
                {chapter.copy}
              </p>
              <p className="mt-4 max-w-3xl border-l-2 border-primary/45 pl-4 text-sm text-foreground/86 sm:text-base">
                {chapter.accent}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section ref={microStoryRef} className="mt-24 space-y-6 text-center">
        <p className="text-xs font-semibold tracking-[0.28em] text-primary/85 uppercase">
          Micro Stories
        </p>
        <div className="mx-auto max-w-5xl space-y-4 overflow-hidden border-y border-border/60 py-8 sm:py-10">
          <motion.p
            style={{ x: microXOne }}
            className="mx-auto text-2xl font-semibold sm:text-4xl"
          >
            Buyers discover clarity faster.
          </motion.p>
          <motion.p
            style={{ x: microXTwo }}
            className="mx-auto text-2xl font-semibold text-primary/88 sm:text-3xl"
          >
            Sellers present value with stronger narrative control.
          </motion.p>
          <motion.p
            style={{ x: microXThree }}
            className="mx-auto text-2xl font-semibold sm:text-3xl"
          >
            Transactions move with visible momentum.
          </motion.p>
        </div>
      </section>

      <RevealSection className="mt-24 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold tracking-[0.28em] text-primary/85 uppercase">
            Platform Engine
          </p>
          <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">
            Every surface is mapped to one goal: reduce uncertainty.
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {platformBands.map((band, index) => (
            <article
              key={band.title}
              data-platform-band
              className="group relative border-t border-border/70 pt-5"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_95%_0%,oklch(0.7_0.15_52_/_0.14),transparent_35%)]" />
              <p className="text-xs font-semibold tracking-[0.24em] text-primary/80 uppercase">
                {band.kicker}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="inline-flex size-10 items-center justify-center rounded-full border border-border/70 text-primary transition-colors group-hover:border-primary/35 group-hover:bg-primary/10">
                  <band.icon className="size-4" />
                </div>
                <h3 className="text-2xl font-semibold">{band.title}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {band.body}
              </p>
              <div className="mt-4 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              <p className="mt-3 text-xs tracking-[0.2em] text-muted-foreground/85 uppercase">
                Scene {index + 1}
              </p>
            </article>
          ))}
        </div>
      </RevealSection>

      <RevealSection className="mt-24 overflow-hidden rounded-[2.3rem] border border-border/70 bg-[linear-gradient(124deg,oklch(0.23_0.02_251_/_0.97)_0%,oklch(0.29_0.07_206_/_0.91)_46%,oklch(0.33_0.12_54_/_0.84)_100%)] px-6 py-10 text-white shadow-[0_78px_120px_-92px_rgba(7,12,24,0.98)] sm:px-10 sm:py-14 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-white/75 uppercase">
              Seller Growth Layer
            </p>
            <h2 className="text-4xl leading-[1.02] font-semibold sm:text-5xl lg:text-6xl">
              Give every seller the presence and operational control of a
              premium showroom.
            </h2>
            <p className="max-w-2xl text-sm text-white/75 sm:text-base">
              From inventory publishing to transaction tracking, sellers get a
              structured command flow that scales quality, not chaos.
            </p>
            <Link to="/seller/dashboard">
              <Button
                variant="secondary"
                size="lg"
                className="mt-2 h-12 bg-white text-slate-900 hover:bg-white/90"
              >
                Open Seller Hub
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {sellerFlow.map((line) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-white/18 bg-white/8 px-4 py-3 backdrop-blur"
              >
                <p className="text-sm text-white/84">{line}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      <RevealSection className="mt-24 pb-6 text-center">
        <div className="mx-auto max-w-4xl space-y-6">
          <p className="text-xs font-semibold tracking-[0.28em] text-primary/85 uppercase">
            Final Conversion
          </p>
          <h2 className="text-4xl leading-[1.02] font-semibold sm:text-6xl">
            Turn browsing into confident action.
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            Explore the marketplace as a buyer or launch your seller workspace
            and publish your inventory with a stronger brand narrative.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/listings">
              <Button size="lg" className="h-12 px-8">
                Start Buying
              </Button>
            </Link>
            <Link to="/seller/apply">
              <Button variant="outline" size="lg" className="h-12 px-8">
                Become a Seller
              </Button>
            </Link>
          </div>
        </div>
      </RevealSection>
    </main>
  );
}

function AmbientBackdrop({
  scale,
  rotate,
}: {
  scale: MotionValue<number>;
  rotate: MotionValue<number>;
}) {
  return (
    <motion.div
      aria-hidden
      style={{ scale, rotate }}
      className="pointer-events-none absolute left-1/2 top-8 -z-10 h-[58rem] w-[58rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.68_0.16_49_/_0.2)_0%,oklch(0.7_0.12_215_/_0.13)_42%,transparent_72%)] blur-2xl"
    />
  );
}

function MovingRibbon() {
  return (
    <section className="mt-7 overflow-hidden rounded-full border border-border/70 bg-card/72 py-3 backdrop-blur-xl">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 24,
          ease: "linear",
        }}
        className="flex w-max items-center gap-4"
      >
        {["lane-a", "lane-b"].map((lane) => (
          <div key={lane} className="flex items-center gap-4 pr-4">
            {heroLines.map((line) => (
              <div
                key={`${lane}-${line}`}
                className="inline-flex items-center gap-2 rounded-full border border-border/65 bg-background/70 px-4 py-1.5"
              >
                <Globe className="size-3.5 text-primary/70" />
                <span className="text-xs font-medium text-foreground/82 uppercase tracking-[0.16em]">
                  {line}
                </span>
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </section>
  );
}

function RevealSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={revealGroup}
      className={cn("relative", className)}
    >
      <motion.div variants={revealUp}>{children}</motion.div>
    </motion.section>
  );
}
