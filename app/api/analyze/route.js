import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function extractRepoInfo(githubUrl) {
  const normalized = githubUrl.trim();
  if (!normalized) return null;

  const patterns = [
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i,
    /^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/i, ""),
      };
    }
  }

  try {
    const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
    if (url.hostname.replace(/^www\./i, "") === "github.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return {
          owner: parts[0],
          repo: parts[1].replace(/\.git$/i, ""),
        };
      }
    }
  } catch {
    // Invalid URL
  }

  return null;
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status}`);
  }
  return response.json();
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status}`);
  }
  return response.text();
}

function cleanJsonResponse(text) {
  const trimmed = text.replace(/```(?:json)?/gi, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function isValidAnalysisPayload(payload) {
  return (
    payload &&
    typeof payload.projectPurpose === "string" &&
    ["Beginner", "Intermediate", "Advanced"].includes(payload.difficultyLevel) &&
    Array.isArray(payload.requiredSkills) &&
    typeof payload.setupTimeEstimate === "string" &&
    Array.isArray(payload.importantFiles) &&
    typeof payload.resumeValueScore === "number"
  );
}

function buildFallbackAnalysis(owner, repo, readmeContent, treeItems) {
  const text = `${owner} ${repo} ${readmeContent}`.toLowerCase();
  const skills = [];

  if (text.includes("react") || text.includes("next")) skills.push("React / Next.js");
  if (text.includes("typescript") || text.includes("ts")) skills.push("TypeScript");
  if (text.includes("tailwind")) skills.push("Tailwind CSS");
  if (text.includes("api") || text.includes("server")) skills.push("API integration");
  if (text.includes("test") || treeItems.some((item) => item.includes("test"))) skills.push("Testing");
  if (skills.length === 0) skills.push("Reading repository docs");

  const importantFiles = treeItems.filter((item) => !item.includes("node_modules")).slice(0, 5);
  const hasMultipleFiles = treeItems.length > 8;
  const difficulty = hasMultipleFiles ? "Intermediate" : "Beginner";
  const setupTime = difficulty === "Intermediate" ? "15-30 minutes" : "5-15 minutes";
  const score = difficulty === "Intermediate" ? 6 : 5;

  return {
    projectPurpose: `This repository appears to be a software project focused on building and shipping a practical application or tool.`,
    difficultyLevel: difficulty,
    requiredSkills: skills,
    setupTimeEstimate: setupTime,
    importantFiles: importantFiles.length > 0 ? importantFiles : ["README.md"],
    resumeValueScore: score,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const githubUrl = body?.githubUrl;

    if (!githubUrl || typeof githubUrl !== "string") {
      return Response.json({ error: "githubUrl is required" }, { status: 400 });
    }

    const repoInfo = extractRepoInfo(githubUrl);
    if (!repoInfo) {
      return Response.json({ error: "Invalid GitHub repository URL" }, { status: 400 });
    }

    const { owner, repo } = repoInfo;
    const githubApiBase = `https://api.github.com/repos/${owner}/${repo}`;

    let readmeContent = "";
    let treeItems = [];

    try {
      readmeContent = await fetchText(`${githubApiBase}/readme`, {
        Accept: "application/vnd.github.v3.raw",
        "User-Agent": "RepoLens",
      });
    } catch {
      readmeContent = "";
    }

    try {
      const treeData = await fetchJson(`${githubApiBase}/git/trees/HEAD?recursive=1`, {
        Accept: "application/vnd.github+json",
        "User-Agent": "RepoLens",
      });
      treeItems = treeData.tree?.map((item) => item.path).filter(Boolean).slice(0, 80) || [];
    } catch {
      treeItems = [];
    }

    const fallbackPayload = buildFallbackAnalysis(owner, repo, readmeContent, treeItems);

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(fallbackPayload, { status: 200 });
    }

    try {
      const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `
You are a repository analyst. Return ONLY a valid JSON object with these exact keys and no extra text:
projectPurpose, difficultyLevel, requiredSkills, setupTimeEstimate, importantFiles, resumeValueScore.

Rules:
- difficultyLevel must be exactly one of: Beginner, Intermediate, Advanced
- requiredSkills must be an array of strings
- importantFiles must be an array of strings
- resumeValueScore must be a number between 0 and 10
- Do not include markdown fences or commentary

Repository: ${owner}/${repo}
README:
${readmeContent.slice(0, 12000)}

Root file tree:
${treeItems.join("\n")}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanedText = cleanJsonResponse(responseText);

      let parsedJson;
      try {
        parsedJson = JSON.parse(cleanedText);
      } catch {
        return Response.json(fallbackPayload, { status: 200 });
      }

      if (!isValidAnalysisPayload(parsedJson)) {
        return Response.json(fallbackPayload, { status: 200 });
      }

      return Response.json(parsedJson, { status: 200 });
    } catch (error) {
      console.error("Gemini analysis failed, using fallback:", error);
      return Response.json(fallbackPayload, { status: 200 });
    }
  } catch (error) {
    console.error("Analyze route error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze repository";
    return Response.json({ error: message }, { status: 500 });
  }
}
