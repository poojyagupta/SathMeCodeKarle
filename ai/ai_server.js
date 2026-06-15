//// http://localhost:5000/ai/complete

/// test case
/* {
  "code_before_cursor": "function printNumbers(n) { for (let i = 1; i <= n; i++) {",
  "code_after_cursor": "",
  "language": "javascript"
}  */

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

app.listen(5001, () => {
  console.log("AI Server running on port 5001 🚀");
});
// Test route
app.get("/", (req, res) => {
  res.send("Local AI server working");
});

// AI completion route
app.post("/ai/complete", async (req, res) => {
  try {
    const { code_before_cursor, language } = req.body;
    const prompt = `# Complete the following ${language} code:\n${code_before_cursor}`;

    const bugResult = await model.generateContent(prompt);

    const response = await bugResult.response;

    const text = response.text();

    const suggestion = text.trim();

    res.json({ suggestion: suggestion.trim() });
  } catch (error) {
    console.error("AI ERROR:", error);
    res
      .status(500)
      .json({ error: "AI request failed", details: error.message });
  }
});

// CODE EXPLANATION API
//// http://localhost:5000/ai/explain

app.post("/ai/explain", async (req, res) => {
  try {
    const { code_snippet } = req.body;

    const prompt = `
Explain the following code in simple words:

${code_snippet}

Explanation:
`;

    const bugResult = await model.generateContent(prompt);

    const response = await bugResult.response;

    const text = response.text();

    const explanation = text.trim();

    res.json({
      explanation: explanation.trim(),
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      error: "Explanation failed",
      details: error.message,
    });
  }
});

// BUG FINDER API
//// http://localhost:5000/ai/debug

app.post("/ai/debug", async (req, res) => {
  try {
    const { code } = req.body;

    const prompt = `
You are a JavaScript bug detector.

Rules:
- If there are bugs → list ONLY the bugs (one line each)
- Do NOT give fix
- Do NOT generate extra code
- Do NOT repeat anything

- If there are NO bugs → write exactly:
no bugs

Code:
${code}

Answer:
`;

    const result = await model.generateContent(prompt);

    const response = await result.response;

    const text = response.text();

    let bugResult = text.trim();
    // 🧠 FILTER 1: Remove unwanted code generation
    if (
      bugResult.includes("function") ||
      bugResult.includes("def ") ||
      bugResult.includes("{") ||
      bugResult.includes("}")
    ) {
      bugResult = "no bugs";
    }

    // 🧠 FILTER 2: Too long = garbage
    if (bugResult.length > 100) {
      bugResult = "no bugs";
    }

    // 🧠 FILTER 3: If "bug" not present → assume no bug
    if (!bugResult.toLowerCase().includes("bug")) {
      bugResult = "no bugs";
    }

    // 🧠 FINAL SAFETY
    if (!bugResult || bugResult.length < 5) {
      bugResult = "no bugs";
    }

    res.json({
      bugs: bugResult,
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      error: "Bug detection failed",
      details: error.message,
    });
  }
});

// ================= MERGE CONFLICT FEATURE =================

// helper: create conflict block
function createConflict(user1, user2) {
  return `<<<<<<< USER 1
${user1}
=======
${user2}
>>>>>>> USER 2
`;
}

// helper: simple line merge (without diff lib)
function simpleLineMerge(code1, code2) {
  const lines1 = code1.split("\n");
  const lines2 = code2.split("\n");

  let merged = "";
  let conflict = false;

  const maxLen = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLen; i++) {
    const l1 = lines1[i] || "";
    const l2 = lines2[i] || "";

    if (l1 === l2) {
      merged += l1 + "\n";
    } else {
      merged += createConflict(l1, l2) + "\n";
      conflict = true;
    }
  }

  return { merged, conflict };
}

// ================= MERGE API =================
// http://localhost:5000/ai/merge

app.post("/ai/merge", async (req, res) => {
  try {
    const { files } = req.body;

    let results = [];

    for (const file of files) {
      const { filename, user1, user2 } = file;

      // No conflict
      if (user1 === user2) {
        results.push({
          filename,
          status: "no_conflict",
          merged_code: user1,
        });
        continue;
      }

      // Line-by-line merge
      const { merged, conflict } = simpleLineMerge(user1, user2);

      let finalCode = merged;

      // AI merge if conflict
      if (conflict) {
        const prompt = `
Merge the following conflicting code into one correct version.

Rules:
- No explanation
- Only final code

${merged}

Final Code:
`;

        const result = await model.generateContent(prompt);

        const response = await result.response;

        let aiResult = response
          .text()
          .replace(/```javascript/g, "")
          .replace(/```js/g, "")
          .replace(/```/g, "")
          .trim();

        if (aiResult && aiResult.length > 10) {
          finalCode = aiResult;
        }
      }

      results.push({
        filename,
        status: conflict ? "conflict" : "merged",
        merged_code: finalCode,
        conflict_preview: conflict ? merged : null,
      });
    }

    res.json({
      success: true,
      result: results,
    });
  } catch (error) {
    console.error("MERGE ERROR:", error);

    res.status(500).json({
      error: "Merge failed",
      details: error.message,
    });
  }
});
