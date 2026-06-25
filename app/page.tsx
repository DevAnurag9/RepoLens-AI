import { ArrowRight, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%),#030712] px-4 py-12 text-white">
      <section className="w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-12">
        <div className="mb-8 flex items-center gap-3 text-sm font-medium text-slate-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <ScanSearch className="h-5 w-5" />
          </div>
          RepoLens
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Understand any GitHub repository in seconds.
          </h1>
          <p className="mt-4 text-lg text-slate-300 sm:text-xl">
            Paste a repository URL and get a clean, intelligent overview of its purpose, structure, and key signals.
          </p>

          <form className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="GitHub repository URL"
              className="h-12 flex-1 border-white/10 bg-slate-950/70 px-4 text-base text-white placeholder:text-slate-500"
              placeholder="https://github.com/owner/repository"
            />
            <Button className="h-12 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
              Analyze
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
