import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function extractRepoInfo(githubUrl) {
  try {
    const url = new URL(githubUrl);
    const parts = url.pathname.split("/").filter(Boolean);

    if (url.hostname.includes("github.com") && parts.length >= 2) {
      return {
        owner: parts[0],
        repo: parts[1],
      };
    }
  } catch {
    // Invalid URL
  }

  return null;
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.json();
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

    const [readmeData, treeData] = await Promise.all([
      fetchJson(`${githubApiBase}/readme`, {
        Accept: "application/vnd.github+json",
        "User-Agent": "RepoLens",
      }),
      fetchJson(`${githubApiBase}/git/trees/HEAD?recursive=1`, {
        Accept: "application/vnd.github+json",
        "User-Agent": "RepoLens",
      }),
    ]);

    const readmeContent = Buffer.from(readmeData.content, "base64").toString("utf-8");
    const treeItems = treeData.tree?.map((item) => item.path).filter(Boolean).slice(0, 80) || [];

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        {
          projectPurpose: "Repository analysis is unavailable because GEMINI_API_KEY is not configured.",
          difficultyLevel: "Beginner",
          requiredSkills: ["Setup environment", "Read repository docs"],
          setupTimeEstimate: "10-20 minutes",
          importantFiles: treeItems.slice(0, 5),
          resumeValueScore: 5,
        },
        { status: 200 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Analyze the following GitHub repository information and return ONLY valid JSON with these exact keys:
projectPurpose, difficultyLevel (Beginner/Intermediate/Advanced), requiredSkills (array of strings), setupTimeEstimate, importantFiles (array), resumeValueScore (number out of 10).

Repository: ${owner}/${repo}
README:
${readmeContent}

Root file tree:
${treeItems.join("\n")}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanedText = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsedJson;
    try {
      parsedJson = JSON.parse(cleanedText);
    } catch {
      parsedJson = {
        projectPurpose: "Unable to parse Gemini response.",
        difficultyLevel: "Beginner",
        requiredSkills: ["Review repository manually"],
        setupTimeEstimate: "15-30 minutes",
        importantFiles: treeItems.slice(0, 5),
        resumeValueScore: 5,
      };
    }

    return Response.json(parsedJson, { status: 200 });
  } catch (error) {
    console.error("Analyze route error:", error);
    return Response.json({ error: "Failed to analyze repository" }, { status: 500 });
  }
}
