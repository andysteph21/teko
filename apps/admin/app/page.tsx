import { ProbePanel } from "../src/features/m1/probe-panel";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-3xl font-black text-brand-800">Console Teko</h1>
        <p className="text-sm text-neutral-500">Validation M1 — socle du lot 1</p>
      </header>
      <section className="rounded-xl bg-neutral-0 p-6 shadow-sm">
        <ProbePanel />
      </section>
    </main>
  );
}
