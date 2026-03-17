#!/usr/bin/env node
/**
 * @fileoverview Extract AI authorship data from git-ai notes across all commits.
 *
 * Reads `refs/notes/ai` attached to each commit in the current branch and
 * produces a JSON report suitable for dashboards and PR comments.
 *
 * Usage:
 *   node extract-ai-stats.js                  # full history
 *   node extract-ai-stats.js --pr <base>..<head>  # PR range only
 *   node extract-ai-stats.js --since 30       # last N commits
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8", maxBuffer: 10_000_000 }).trim();
  } catch {
    return "";
  }
}

function parseNote(raw) {
  if (!raw) return null;
  const jsonStart = raw.indexOf("{");
  if (jsonStart === -1) return null;

  const headerLines = raw.slice(0, jsonStart).trim().split("\n").filter(Boolean);
  let json;
  try {
    json = JSON.parse(raw.slice(jsonStart));
  } catch {
    return null;
  }

  // Parse per-file line attributions from the header section
  const files = {};
  let currentFile = null;
  for (const line of headerLines) {
    if (line.startsWith("  ")) {
      // indented = prompt+lines for current file
      if (currentFile) {
        const parts = line.trim().split(/\s+/);
        const promptId = parts[0];
        const lineRanges = parts.slice(1).join(",");
        if (!files[currentFile]) files[currentFile] = [];
        files[currentFile].push({ promptId, lineRanges });
      }
    } else {
      currentFile = line.trim();
    }
  }

  return { ...json, files };
}

function expandRanges(rangeStr) {
  if (!rangeStr) return 0;
  let count = 0;
  for (const part of rangeStr.split(",")) {
    const [start, end] = part.split("-").map(Number);
    count += end ? end - start + 1 : 1;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

function extractCommits(range) {
  const logFormat = "%H";
  const log = range
    ? git(`log --format="${logFormat}" ${range}`)
    : git(`log --format="${logFormat}"`);

  if (!log) return [];
  return log.split("\n").filter(Boolean);
}

function extractStats(commits) {
  const results = [];

  for (const sha of commits) {
    const noteRaw = git(`notes --ref=refs/notes/ai show ${sha}`);
    if (!noteRaw) continue;

    const note = parseNote(noteRaw);
    if (!note) continue;

    const commitInfo = git(`log -1 --format="%an|%ae|%aI|%s" ${sha}`);
    const [authorName, authorEmail, date, subject] = commitInfo.split("|");

    const prompts = note.prompts || {};
    const fileEntries = note.files || {};

    // Compute per-file AI line counts
    const fileStats = {};
    for (const [filePath, attributions] of Object.entries(fileEntries)) {
      let aiLines = 0;
      for (const attr of attributions) {
        aiLines += expandRanges(attr.lineRanges);
      }
      // Get total lines in file at this commit (cross-platform)
      const fileContent = git(`show ${sha}:${filePath}`);
      const totalLines = fileContent ? fileContent.split("\n").length : 0;
      fileStats[filePath] = {
        aiLines,
        totalLines: totalLines || aiLines, // fallback
        aiPercent: totalLines ? Math.round((aiLines / totalLines) * 100) : 0,
      };
    }

    // Aggregate prompt-level stats
    let totalAccepted = 0;
    let totalOverridden = 0;
    const models = new Set();
    const tools = new Set();

    for (const prompt of Object.values(prompts)) {
      totalAccepted += prompt.accepted_lines || 0;
      totalOverridden += prompt.overriden_lines || 0;
      if (prompt.agent_id?.model) models.add(prompt.agent_id.model);
      if (prompt.agent_id?.tool) tools.add(prompt.agent_id.tool);
    }

    results.push({
      sha: sha.slice(0, 8),
      shaFull: sha,
      date,
      author: authorName,
      email: authorEmail,
      subject,
      models: [...models],
      tools: [...tools],
      totalAccepted,
      totalOverridden,
      acceptanceRate:
        totalAccepted + totalOverridden > 0
          ? Math.round(
              (totalAccepted / (totalAccepted + totalOverridden)) * 100,
            )
          : 100,
      files: fileStats,
      promptCount: Object.keys(prompts).length,
    });
  }

  return results;
}

function buildSummary(commitStats) {
  const totalAccepted = commitStats.reduce((s, c) => s + c.totalAccepted, 0);
  const totalOverridden = commitStats.reduce(
    (s, c) => s + c.totalOverridden,
    0,
  );
  const allModels = [...new Set(commitStats.flatMap((c) => c.models))];
  const allTools = [...new Set(commitStats.flatMap((c) => c.tools))];
  const totalPrompts = commitStats.reduce((s, c) => s + c.promptCount, 0);

  // File-level aggregation (latest occurrence wins)
  const fileMap = {};
  for (const commit of commitStats) {
    for (const [filePath, stats] of Object.entries(commit.files)) {
      fileMap[filePath] = stats;
    }
  }

  // Per-model breakdown
  const modelBreakdown = {};
  for (const commit of commitStats) {
    for (const model of commit.models) {
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { commits: 0, acceptedLines: 0 };
      }
      modelBreakdown[model].commits += 1;
      modelBreakdown[model].acceptedLines += commit.totalAccepted;
    }
  }

  // Timeline (per-date)
  const timeline = commitStats
    .map((c) => ({
      date: c.date?.split("T")[0],
      sha: c.sha,
      subject: c.subject,
      aiLines: c.totalAccepted,
      models: c.models,
    }))
    .reverse(); // chronological

  return {
    generated: new Date().toISOString(),
    totalCommitsWithAI: commitStats.length,
    totalPrompts,
    totalAcceptedLines: totalAccepted,
    totalOverriddenLines: totalOverridden,
    overallAcceptanceRate:
      totalAccepted + totalOverridden > 0
        ? Math.round(
            (totalAccepted / (totalAccepted + totalOverridden)) * 100,
          )
        : 100,
    models: allModels,
    tools: allTools,
    modelBreakdown,
    files: fileMap,
    timeline,
    commits: commitStats,
  };
}

// ---------------------------------------------------------------------------
// PR comment markdown generation
// ---------------------------------------------------------------------------

function generatePRComment(summary) {
  const lines = [];

  lines.push("## 🤖 AI Authorship Report\n");

  // Overall stats bar
  const aiPct = summary.overallAcceptanceRate;
  const humanPct = 100 - aiPct;
  lines.push(
    `**${summary.totalCommitsWithAI}** commit${summary.totalCommitsWithAI !== 1 ? "s" : ""} with AI assistance | ` +
      `**${summary.totalAcceptedLines}** AI-authored lines accepted | ` +
      `**${summary.models.join(", ")}**\n`,
  );

  // File table
  const fileEntries = Object.entries(summary.files);
  if (fileEntries.length > 0) {
    lines.push("### Files Changed\n");
    lines.push("| File | AI Lines | Total Lines | AI % |");
    lines.push("|------|----------|-------------|------|");
    for (const [file, stats] of fileEntries.sort(
      (a, b) => b[1].aiPercent - a[1].aiPercent,
    )) {
      const bar = stats.aiPercent > 50 ? "🟣" : stats.aiPercent > 20 ? "🔵" : "⚪";
      lines.push(
        `| ${bar} \`${file}\` | ${stats.aiLines} | ${stats.totalLines} | ${stats.aiPercent}% |`,
      );
    }
    lines.push("");
  }

  // Model breakdown
  if (Object.keys(summary.modelBreakdown).length > 0) {
    lines.push("### Models Used\n");
    lines.push("| Model | Commits | Lines |");
    lines.push("|-------|---------|-------|");
    for (const [model, data] of Object.entries(summary.modelBreakdown)) {
      lines.push(`| \`${model}\` | ${data.commits} | ${data.acceptedLines} |`);
    }
    lines.push("");
  }

  lines.push(
    `\n<sub>Generated by ai-authorship-tracker • ${new Date().toISOString().split("T")[0]}</sub>`,
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const isPR = args.includes("--pr");
const sinceIdx = args.indexOf("--since");
const outIdx = args.indexOf("--out");
const formatIdx = args.indexOf("--format");

let range = null;
if (isPR) {
  range = args[args.indexOf("--pr") + 1];
} else if (sinceIdx !== -1) {
  const n = parseInt(args[sinceIdx + 1], 10) || 30;
  range = `HEAD~${n}..HEAD`;
}

const outputPath = outIdx !== -1 ? args[outIdx + 1] : null;
const format = formatIdx !== -1 ? args[formatIdx + 1] : "json";

// Ensure notes are fetched
git("fetch origin refs/notes/ai:refs/notes/ai 2>/dev/null");

const commits = extractCommits(range);
const stats = extractStats(commits);
const summary = buildSummary(stats);

let output;
if (format === "markdown" || format === "md") {
  output = generatePRComment(summary);
} else {
  output = JSON.stringify(summary, null, 2);
}

if (outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, output, "utf-8");
  console.log(`Written to ${outputPath}`);
} else {
  console.log(output);
}
