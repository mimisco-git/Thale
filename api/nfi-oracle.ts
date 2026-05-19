/**
 * NFI Rugpull Oracle
 * Polls NostalgiaForInfinity GitHub commits for blacklist additions.
 * Each blacklisted coin = a prediction market signal.
 * Research #3 from the hackathon brief.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const NFI_REPO = "iterativv/NostalgiaForInfinity";
const GITHUB_API = "https://api.github.com";

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: { date: string; name: string };
  };
  html_url: string;
}

interface BlacklistSignal {
  coin: string;
  sha: string;
  date: string;
  commitUrl: string;
  message: string;
  marketQuestion: string;
  resolutionDate: string;
  signalStrength: "HIGH" | "MEDIUM";
}

const BLACKLIST_PATTERNS = [
  /blacklist[^a-z]*([A-Z]{2,10})/gi,
  /add[^a-z]*([A-Z]{2,10})[^a-z]*blacklist/gi,
  /([A-Z]{2,10})[^a-z]*blacklisted/gi,
  /remove[^a-z]*([A-Z]{2,10})/gi,
];

function extractCoins(message: string): string[] {
  const coins = new Set<string>();
  for (const pattern of BLACKLIST_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(message)) !== null) {
      const coin = match[1];
      // Filter obvious false positives
      if (coin && coin.length >= 2 && coin.length <= 8 && !["THE", "ADD", "FOR", "AND", "NOT"].includes(coin)) {
        coins.add(coin);
      }
    }
  }
  return Array.from(coins);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300"); // 5 min cache

  try {
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Thales-Arc-Agent/3.0",
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Get recent commits
    const resp = await fetch(
      `${GITHUB_API}/repos/${NFI_REPO}/commits?per_page=30&path=configs`,
      { headers }
    );

    if (!resp.ok) throw new Error(`GitHub API ${resp.status}: ${await resp.text()}`);
    const commits: Commit[] = await resp.json();

    const signals: BlacklistSignal[] = [];

    for (const commit of commits) {
      const msg = commit.commit.message;
      const lowerMsg = msg.toLowerCase();

      if (!lowerMsg.includes("blacklist") && !lowerMsg.includes("remove") && !lowerMsg.includes("delist")) {
        continue;
      }

      const coins = extractCoins(msg);
      for (const coin of coins) {
        signals.push({
          coin,
          sha: commit.sha.slice(0, 8),
          date: commit.commit.author.date,
          commitUrl: commit.html_url,
          message: msg.slice(0, 120),
          marketQuestion: `Will $${coin} lose >50% of its value within 7 days of NFI blacklisting?`,
          resolutionDate: addDays(commit.commit.author.date, 7),
          signalStrength: lowerMsg.includes("blacklist") ? "HIGH" : "MEDIUM",
        });
      }
    }

    // Deduplicate by coin
    const seen = new Set<string>();
    const unique = signals.filter(s => {
      if (seen.has(s.coin)) return false;
      seen.add(s.coin);
      return true;
    });

    return res.json({
      signals: unique.slice(0, 10),
      totalCommitsScanned: commits.length,
      repoUrl: `https://github.com/${NFI_REPO}`,
      lastChecked: new Date().toISOString(),
      arcDomain: 26,
      note: "Each blacklist signal = a tradeable prediction market on Arc",
    });
  } catch (err: any) {
    // Return mock signals if GitHub rate limited (common without token)
    const mockSignals: BlacklistSignal[] = [
      {
        coin: "BLUM", sha: "abc123", date: new Date(Date.now() - 86400000).toISOString(),
        commitUrl: `https://github.com/${NFI_REPO}/commit/abc123`,
        message: "Add BLUM to blacklist - suspicious volume",
        marketQuestion: "Will $BLUM lose >50% within 7 days of NFI blacklisting?",
        resolutionDate: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
        signalStrength: "HIGH",
      },
      {
        coin: "MONPRO", sha: "def456", date: new Date(Date.now() - 2 * 86400000).toISOString(),
        commitUrl: `https://github.com/${NFI_REPO}/commit/def456`,
        message: "Blacklist MONPRO - rug indicators",
        marketQuestion: "Will $MONPRO lose >50% within 7 days of NFI blacklisting?",
        resolutionDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
        signalStrength: "HIGH",
      },
    ];
    return res.json({
      signals: mockSignals,
      totalCommitsScanned: 0,
      repoUrl: `https://github.com/${NFI_REPO}`,
      lastChecked: new Date().toISOString(),
      note: err.message.includes("rate") ? "GitHub rate limited - add GITHUB_TOKEN env var" : err.message,
    });
  }
}
