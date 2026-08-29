import Link from "next/link";

const Code = ({ children }: { children: string }) => (
  <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-white">
    <code>{children}</code>
  </pre>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
    {children}
  </span>
);

const Feature = ({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
    <div className="text-base font-semibold text-white">{title}</div>
    <p className="mt-2 text-sm leading-6 text-white/70">{desc}</p>
  </div>
);

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[#070A12] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(99,102,241,0.25),transparent_55%),radial-gradient(900px_circle_at_80%_20%,rgba(16,185,129,0.18),transparent_55%),radial-gradient(900px_circle_at_50%_90%,rgba(244,63,94,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_25%,transparent_75%,rgba(255,255,255,0.04))]" />
      </div>

      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
            <span className="text-sm font-bold">P</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Porter</div>
            <div className="text-xs text-white/60">Port forwarding, simplified</div>
          </div>
        </div>

        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#demo" className="hover:text-white">Demo</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="https://github.com/SandeepK1729/porter-agent"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
          >
            GitHub (Agent)
          </Link>
          <Link
            href="https://github.com/SandeepK1729/porter-server"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
          >
            GitHub (Server)
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <Pill>TypeScript</Pill>
              <Pill>CLI Agent</Pill>
              <Pill>Relay Server</Pill>
              <Pill>Fast setup</Pill>
            </div>

            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              Secure port forwarding for demos, local dev, and quick sharing.
            </h1>

            <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-white/70">
              Porter is a lightweight <span className="text-white/90">agent + server</span> pair that helps you expose
              local ports in a controlled way—without overcomplicated infra.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#demo"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
              >
                Run the demo
              </a>
              <a
                href="#how"
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                How it works
              </a>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Simple", "Minimal moving parts"],
                ["Fast", "Optimized for local dev"],
                ["Portable", "Works anywhere Node runs"],
                ["Open", "MIT licensed"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-sm font-semibold">{k}</div>
                  <div className="mt-1 text-xs text-white/60">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-xl">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Quickstart</div>
                <div className="text-xs text-white/60">copy & paste</div>
              </div>
              <div className="mt-4 space-y-3">
                <Code>{`# 1) start server
npm run dev

# 2) install agent
npm i -g @sandeepk1729/porter

# 3) forward local port 3000
porter --local 3000 --remote 80 --host <server-host>`}</Code>
                <div className="text-xs text-white/60">
                  Tip: replace <span className="text-white/80">&lt;server-host&gt;</span> with your deployed server.
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-emerald-500/10 to-rose-500/10 p-5">
              <div className="text-sm font-semibold">Made for demos</div>
              <p className="mt-1 text-sm text-white/70">
                Share “localhost” with teammates, testers, and stakeholders—without hand-holding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold">Features</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
          A clean separation between a CLI agent and a forwarding server keeps the system easy to reason about.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Feature title="Agent-first workflow" desc="Run a simple CLI locally and forward only the ports you intend to share." />
          <Feature title="Server relay" desc="Central service that brokers connections and keeps your setup consistent across environments." />
          <Feature title="TypeScript codebase" desc="Readable, maintainable code with straightforward build tooling." />
          <Feature title="Great for local dev" desc="Expose a dev server to a remote device or teammate without new infra." />
          <Feature title="Minimal dependencies" desc="Keep runtime light and reduce surface area." />
          <Feature title="Easy to deploy" desc="Deploy the server where you need it (VM, container, PaaS), then point the agent at it." />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="text-2xl font-semibold">How it works</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Porter uses a simple mental model: your machine runs an agent that establishes a connection to a server,
              which then forwards traffic to your chosen local port.
            </p>

            <ol className="mt-6 space-y-4 text-sm text-white/75">
              <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-semibold text-white">1) Start the agent</div>
                <div className="mt-1">Point it to the server and select the local port.</div>
              </li>
              <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-semibold text-white">2) Share the URL</div>
                <div className="mt-1">Visitors hit the server; traffic gets forwarded to your local service.</div>
              </li>
            </ol>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-sm font-semibold">Architecture</div>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="font-semibold text-white">Client</div>
                <div className="mt-1">Browser / external consumer</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="font-semibold text-white">Porter Server</div>
                <div className="mt-1">Public endpoint / relay</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="font-semibold text-white">Porter Agent</div>
                <div className="mt-1">Local CLI forwarding to your chosen port</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="font-semibold text-white">Your App</div>
                <div className="mt-1">e.g. localhost:3000</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8">
          <h2 className="text-2xl font-semibold">Demo</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            Use the commands below as a starting point (adjust flags to match your server/agent options).
          </p>

            <div>
              <div className="mb-2 text-sm font-semibold">Run agent</div>
              <Code>{`npm i -g @sandeepk1729/porter

# Forward your local app (example)
porter http 3000`}</Code>
            </div>
          </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold">FAQ</h2>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            {
              q: "Is this like ngrok?",
              a: "Similar goal (expose local services), different implementation and constraints. Porter is designed to stay minimal and hackable.",
            },
            {
              q: "Can I self-host the server?",
              a: "Yes—run it anywhere Node runs (or containerize it) and point the agent to your server host.",
            },
            {
              q: "Does it support auth?",
              a: "If you want tokens / basic auth / IP allowlists, tell me your preference and I’ll reflect it in the UI copy and links.",
            },
            {
              q: "Where do I configure ports?",
              a: "In the agent CLI flags (or config). The homepage can document the exact flags once you confirm them.",
            },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm font-semibold">{item.q}</div>
              <div className="mt-2 text-sm leading-6 text-white/70">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col justify-between gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center">
          <div className="text-sm text-white/60">
            © {new Date().getFullYear()} Porter • Built for demos and dev workflows
          </div>
          <div className="flex gap-4 text-sm text-white/70">
            <a className="hover:text-white" href="https://github.com/SandeepK1729/porter-agent">Agent</a>
            <a className="hover:text-white" href="https://github.com/SandeepK1729/porter-server">Server</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
