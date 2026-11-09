import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import {
  ArrowRight, BookOpen, Copy, Folder, Hash, Keyboard, Lock, Pin, Search, Sparkles, Star, Zap, Smartphone, LayoutDashboard,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ThemeToggle } from "@/components/shell/AppShell";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "LinkVault — Everything Worth Saving. One Place." },
      { name: "description", content: "Save links, notes and resources in a private, beautifully organized vault with folders, tags, search and a reading queue." },
      { property: "og:title", content: "LinkVault — Everything Worth Saving" },
      { property: "og:description", content: "A private, beautifully organized vault for every link worth keeping." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Zap, title: "Instant previews", text: "Paste a link — title, icon, description and image fill in on their own." },
  { icon: Copy, title: "Duplicate radar", text: "Spots the same link even with www. or tracking junk added." },
  { icon: Folder, title: "Folders & tags", text: "Nested folders, pinned favorites and tags that stay tidy." },
  { icon: BookOpen, title: "Reading queue", text: "Mark what to read next and track what you've finished." },
  { icon: Search, title: "Search everything", text: "Press Ctrl/⌘K and jump to anything in milliseconds." },
  { icon: Lock, title: "Private by default", text: "Your vault is yours alone. Nobody else can see it." },
];

const showcase = [
  { icon: LayoutDashboard, title: "Custom dashboard", text: "Drag, resize and hide cards. Every number opens the items behind it." },
  { icon: Smartphone, title: "Made for phones", text: "Swipe to favorite or trash, with a thumb-friendly add button." },
  { icon: Keyboard, title: "Keyboard first", text: "Shortcuts for everything when you're at your desk." },
  { icon: Pin, title: "Pin what matters", text: "Keep key links and folders one tap away." },
];

const floating = [
  { icon: Star, label: "Design systems", x: "-8%", y: "12%", d: 0 },
  { icon: Hash, label: "#research", x: "78%", y: "4%", d: 0.6 },
  { icon: BookOpen, label: "Reading · 12", x: "84%", y: "70%", d: 1.2 },
  { icon: Folder, label: "Side projects", x: "-4%", y: "78%", d: 1.8 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }),
};

function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 6]);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
          <motion.div
            className="absolute -top-32 left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-0 top-40 size-72 rounded-full bg-accent blur-[90px]"
            animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1">
              <Sparkles className="size-3.5 text-primary" /> Your second brain for the web
            </Badge>
          </motion.div>
          <motion.h1
            initial="hidden" animate="show" custom={1} variants={fadeUp}
            className="mx-auto mt-6 max-w-4xl font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl"
          >
            Everything worth saving.{" "}
            <span className="relative inline-block text-primary">
              One place.
              <motion.svg viewBox="0 0 300 20" className="absolute -bottom-2 left-0 w-full" aria-hidden>
                <motion.path
                  d="M4 14 Q 150 0 296 12" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 1 }}
                />
              </motion.svg>
            </span>
          </motion.h1>
          <motion.p initial="hidden" animate="show" custom={2} variants={fadeUp} className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            LinkVault keeps your links, notes and resources beautifully organized — with instant previews, smart duplicate checks and search that just works.
          </motion.p>
          <motion.div initial="hidden" animate="show" custom={3} variants={fadeUp} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="group h-12 px-7 text-base shadow-lift">
              <Link to="/auth">Start your vault free <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base"><a href="#features">See features</a></Button>
          </motion.div>

          {/* Mock app */}
          <motion.div style={{ y, rotateX: rotate }} className="relative mx-auto mt-16 max-w-4xl [perspective:1200px]">
            {floating.map((f) => (
              <motion.div
                key={f.label}
                className="absolute z-10 hidden items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm shadow-lift md:flex"
                style={{ left: f.x, top: f.y }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
                transition={{ opacity: { delay: 1 + f.d / 3 }, scale: { delay: 1 + f.d / 3 }, y: { duration: 4, repeat: Infinity, delay: f.d } }}
              >
                <f.icon className="size-4 text-primary" /> {f.label}
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-2xl border bg-card text-left shadow-lift"
            >
              <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-3">
                <span className="size-3 rounded-full bg-destructive/60" /><span className="size-3 rounded-full bg-primary/50" /><span className="size-3 rounded-full bg-muted-foreground/30" />
                <div className="ml-4 flex h-7 flex-1 items-center gap-2 rounded-md bg-background px-3 text-xs text-muted-foreground"><Search className="size-3.5" /> Search your vault… <kbd className="ml-auto font-mono">⌘K</kbd></div>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {["Refactoring UI", "The Pragmatic Programmer", "Figma Config talks", "Tailwind v4 notes", "Rust book", "Typography guide"].map((t, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + i * 0.1 }}
                    whileHover={{ y: -4 }}
                    className="rounded-xl border bg-background p-3"
                  >
                    <div className="mb-3 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-accent" />
                    <p className="truncate text-sm font-medium">{t}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">#{["design", "dev", "talks", "css", "rust", "type"][i]}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <section className="border-y bg-muted/30 py-5">
        <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <motion.div className="flex shrink-0 gap-10 pr-10" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}>
            {[...Array(2)].flatMap((_, k) =>
              ["Articles", "Videos", "Repos", "Docs", "Tweets", "Recipes", "Courses", "Podcasts", "Papers", "Tools"].map((w) => (
                <span key={w + k} className="flex items-center gap-10 whitespace-nowrap font-display text-2xl font-semibold text-muted-foreground/70">
                  {w} <Sparkles className="size-4 text-primary" />
                </span>
              )),
            )}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Features</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Built for people who save a lot.</h2>
        </motion.div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} variants={fadeUp} whileHover={{ y: -6 }}>
              <Card className="group h-full border-border/70 transition-shadow hover:shadow-lift">
                <CardContent className="p-6">
                  <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:rotate-6 group-hover:scale-110">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Showcase carousel */}
      <section className="bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.h2 initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center font-display text-4xl font-semibold tracking-tight">
            Thoughtful in every detail
          </motion.h2>
          <Carousel opts={{ loop: true, align: "start" }} className="mx-auto mt-12 max-w-4xl px-2 sm:px-12">
            <CarouselContent>
              {showcase.map((s) => (
                <CarouselItem key={s.title} className="sm:basis-1/2">
                  <Card className="h-full overflow-hidden">
                    <div className="grid h-40 place-items-center bg-gradient-to-br from-primary/25 via-accent to-background">
                      <s.icon className="size-14 text-primary" />
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold">{s.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <h2 className="text-center font-display text-4xl font-semibold tracking-tight">Questions</h2>
        <Accordion type="single" collapsible className="mt-10">
          {[
            ["Is LinkVault free?", "Yes — create an account and start saving right away."],
            ["Who can see my links?", "Only you. Every vault is private to its owner."],
            ["Can I export my data?", "Anytime, as JSON, CSV or Markdown from Settings."],
            ["Does it work on my phone?", "Absolutely. It's designed for phones first, with swipe gestures."],
          ].map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left text-base">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground shadow-lift"
        >
          <motion.div aria-hidden className="absolute -right-20 -top-20 size-72 rounded-full bg-primary-foreground/10" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
          <h2 className="relative font-display text-4xl font-semibold tracking-tight sm:text-5xl">Stop losing great links.</h2>
          <p className="relative mx-auto mt-4 max-w-md opacity-85">Your vault is one click away.</p>
          <Button asChild size="lg" variant="secondary" className="relative mt-8 h-12 px-8 text-base">
            <Link to="/auth">Create your vault <ArrowRight /></Link>
          </Button>
        </motion.div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <Logo className="mb-3 justify-center" />
        <p>© {new Date().getFullYear()} LinkVault. Everything worth saving.</p>
      </footer>
    </div>
  );
}
