//// http://localhost:5000/ai/complete

/// test case
/* {
  "code_before_cursor": "function printNumbers(n) { for (let i = 1; i <= n; i++) {",
  "code_after_cursor": "",
  "language": "javascript"
}  */

  
import express from "express";
import cors from "cors";
import { pipeline } from "@xenova/transformers";

const app = express();
app.use(cors());
app.use(express.json());

let generator;

(async () => {
  console.log("Loading local AI model... (may take a minute)");
  // Load small code model
  generator = await pipeline("text-generation", "Xenova/codegen-350M-mono");
  console.log("Model loaded ✅");

  // Start server only after model loads
  app.listen(5000, () => {
    console.log("AI Server running on port 5000 🚀");
  });
})();

// Test route
app.get("/", (req, res) => {
  res.send("Local AI server working");
});

// AI completion route
app.post("/ai/complete", async (req, res) => {
  try {
    const { code_before_cursor, language } = req.body;
    const prompt = `# Complete the following ${language} code:\n${code_before_cursor}`;

    const output = await generator(prompt, { max_new_tokens: 50 });
    const suggestion = output[0].generated_text.slice(prompt.length);

    res.json({ suggestion: suggestion.trim() });

  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ error: "AI request failed", details: error.message });
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

    const output = await generator(prompt, {
      max_new_tokens: 80
    });

    const explanation = output[0].generated_text.slice(prompt.length);

    res.json({
      explanation: explanation.trim()
    });

  } catch (error) {

    console.error("AI ERROR:", error);

    res.status(500).json({
      error: "Explanation failed",
      details: error.message
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

    const output = await generator(prompt, {
      max_new_tokens: 30,
      temperature: 0.1,
      repetition_penalty: 1.5
    });

    let result = output[0].generated_text.slice(prompt.length).trim();

    // 🧠 FILTER 1: Remove unwanted code generation
    if (
      result.includes("function") ||
      result.includes("def ") ||
      result.includes("{") ||
      result.includes("}")
    ) {
      result = "no bugs";
    }

    // 🧠 FILTER 2: Too long = garbage
    if (result.length > 100) {
      result = "no bugs";
    }

    // 🧠 FILTER 3: If "bug" not present → assume no bug
    if (!result.toLowerCase().includes("bug")) {
      result = "no bugs";
    }

    // 🧠 FINAL SAFETY
    if (!result || result.length < 5) {
      result = "no bugs";
    }

    res.json({
      bugs: result
    });

  } catch (error) {

    console.error("AI ERROR:", error);

    res.status(500).json({
      error: "Bug detection failed",
      details: error.message
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
          merged_code: user1
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

        const output = await generator(prompt, {
          max_new_tokens: 150,
          temperature: 0.2
        });

        let aiResult = output[0].generated_text.slice(prompt.length).trim();

        if (aiResult && aiResult.length > 10) {
          finalCode = aiResult;
        }
      }

      results.push({
        filename,
        status: conflict ? "conflict" : "merged",
        merged_code: finalCode,
        conflict_preview: conflict ? merged : null
      });
    }

    res.json({
      success: true,
      result: results
    });

  } catch (error) {
    console.error("MERGE ERROR:", error);

    res.status(500).json({
      error: "Merge failed",
      details: error.message
    });
  }
});





