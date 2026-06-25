"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, FileCode2, RefreshCcw, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loadingMessages = [
  "Reading their messy code...",
  "Judging their commit messages...",
  "Calculating resume value...",
  "Summarizing the repo story...",
];

type AnalysisResult = {
  projectPurpose: string;
  difficultyLevel: string;
  requiredSkills: string[];
  setupTimeEstimate: string;
  importantFiles: string[];
  resumeValueScore: number;
  error?: string;
};

export default function Home() {
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setIsLoading(true);
    setResult(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: githubUrl.trim() }),
      });

      let data: AnalysisResult | { error?: string } | null = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error || `Analysis failed with status ${response.status}`);
      }

      if (!data || typeof data !== "object") {
        throw new Error("The analysis API returned an invalid response.");
      }

      setResult(data as AnalysisResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const scoreTone = useMemo(() => {
    if (!result?.resumeValueScore) return "text-cyan-300";
    if (result.resumeValueScore >= 8) return "text-emerald-300";
    if (result.resumeValueScore >= 6) return "text-amber-300";
    return "text-rose-300";
  }, [result]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%),#030712] px-4 py-12 text-white">
      <section className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-12">
        <div className="mb-8 flex items-center gap-3 text-sm font-medium text-slate-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <ScanSearch className="h-5 w-5" />
          </div>
          RepoLens
        </div>

        {!result && !isLoading && !errorMessage ? (
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Understand any GitHub repository in seconds.
            </h1>
            <p className="mt-4 text-lg text-slate-300 sm:text-xl">
              Paste a repository URL and get a clean, intelligent overview of its purpose, structure, and key signals.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Input
                aria-label="GitHub repository URL"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                disabled={isLoading}
                className="h-12 flex-1 border-white/10 bg-slate-950/70 px-4 text-base text-white placeholder:text-slate-500"
                placeholder="https://github.com/owner/repository"
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Analyze
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {isLoading ? (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6 text-center text-cyan-100">
                <p className="text-lg font-semibold">{loadingMessages[loadingIndex]}</p>
                <p className="mt-2 text-sm text-cyan-200/80">Analyzing the repo and extracting the most relevant signals.</p>
              </div>
            ) : errorMessage ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-8 text-center text-rose-100">
                <p className="text-lg font-semibold">Analysis unavailable</p>
                <p className="mt-2 text-sm text-rose-200/80">{errorMessage}</p>
                <Button
                  onClick={() => {
                    setErrorMessage(null);
                    setGithubUrl("");
                  }}
                  className="mt-6 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Try Another URL
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Analysis complete</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{result?.projectPurpose || "Repository insight"}</h2>
                  </div>
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full border border-current bg-slate-900/80 text-3xl font-black ${scoreTone}`}>
                    {result?.resumeValueScore ?? 0}/10
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-white/10 bg-slate-950/70">
                    <CardHeader>
                      <CardTitle>Difficulty</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-medium text-slate-100">{result?.difficultyLevel}</p>
                      <p className="mt-2 text-sm text-slate-400">A quick read on how involved the repository is to pick up.</p>
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-slate-950/70">
                    <CardHeader>
                      <CardTitle>Setup Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-medium text-slate-100">{result?.setupTimeEstimate}</p>
                      <p className="mt-2 text-sm text-slate-400">Estimated time to get it running locally.</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-white/10 bg-slate-950/70">
                  <CardHeader>
                    <CardTitle>Required Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result?.requiredSkills?.map((skill) => (
                        <span key={skill} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-slate-950/70">
                  <CardHeader>
                    <CardTitle>Important Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result?.importantFiles?.map((file) => (
                        <li key={file} className="flex items-center gap-2 text-slate-200">
                          <FileCode2 className="h-4 w-4 text-cyan-300" />
                          {file}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      setResult(null);
                      setErrorMessage(null);
                      setGithubUrl("");
                    }}
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Analyze Another Repo
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
