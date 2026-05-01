const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const fs = require("fs");

const path = require("path");
const cors = require("cors");
const app = express();
const { extractFunctions } = require("./parser");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
app.use(express.json());
app.use(cors());
const DATA_PATH = path.join(__dirname, "project.json");
const server = http.createServer(app);
// Attach socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
// 🔥 store last code per user
const userCodeMap = {};
const userFunctionsMap = {};
let currentProcess = null;
let currentProject;

if (fs.existsSync(DATA_PATH)) {
  currentProject = JSON.parse(fs.readFileSync(DATA_PATH));
} else {
  currentProject = {
    projectId: "abc",
    files: {
      "package.json": "file:package.json",
      "src/index.js": "file:src/index.js",
    },
  };
}

function detectConflicts(userFunctionsMap) {
  const functionMap = {};

  for (const userId in userFunctionsMap) {
    const files = userFunctionsMap[userId];

    for (const fileName in files) {
      const functions = files[fileName];

      functions.forEach((fn) => {
        if (!functionMap[fn.name]) {
          functionMap[fn.name] = [];
        }

        functionMap[fn.name].push({
          user: userId,
          body: fn.body,
          file: fileName,
        });
      });
    }
  }

  const conflicts = [];

  for (const fnName in functionMap) {
    const versions = functionMap[fnName];

    // 🔥 UNIQUE USERS
    const uniqueUsers = [...new Set(versions.map((v) => v.user))];

    // 🔥 UNIQUE BODIES
    const uniqueBodies = [...new Set(versions.map((v) => v.body))];

    // 🔥 REAL CONDITION
    if (uniqueUsers.length > 1 && uniqueBodies.length > 1) {
      conflicts.push({
        type: "function_conflict",
        function: fnName,
        users: uniqueUsers,
        changes: versions,
      });
    }
  }

  return conflicts;
}
io.on("connection", (socket) => {
  // 🔥 send project to new user
  socket.on("request-project", () => {
    socket.emit("project-update", currentProject);
  });

  socket.on("project-update", (project) => {
    currentProject = project;

    // 🔥 SAVE TO FILE
    fs.writeFileSync(DATA_PATH, JSON.stringify(project, null, 2));

    socket.broadcast.emit("project-update", project);
  });
  socket.on("code-change", async ({ fileName, code }) => {
    if (!userCodeMap[socket.id]) {
      userCodeMap[socket.id] = {};
    }

    userCodeMap[socket.id][fileName] = code;

    const functions = extractFunctions(code).filter(
      (fn) => fn.body.trim() !== "",
    );

    // 🔥 NEW LINE
    if (!userFunctionsMap[socket.id]) {
      userFunctionsMap[socket.id] = {};
    }

    userFunctionsMap[socket.id][fileName] = functions;

    console.log(`🧠 Functions for ${socket.id}:`, functions);
    const conflicts = detectConflicts(userFunctionsMap);

    if (conflicts.length > 0) {
      console.log("🚨 CONFLICT DETECTED:", conflicts);

      const conflict = conflicts[0];
      const versions = conflict.changes;

      const user1 = versions[0]?.body || "";
      const user2 = versions[1]?.body || "";

      try {
        const response = await fetch("http://localhost:5001/ai/merge", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: [
              {
                filename: conflict.function,
                user1,
                user2,
              },
            ],
          }),
        });

        const data = await response.json();

        const aiSuggestion = data.result[0]?.merged_code;

        console.log("🤖 AI SUGGESTION:", aiSuggestion);

        io.emit("conflict-detected", {
          conflict,
          aiSuggestion,
          fileName: versions[0]?.file, // 🔥 ADD THIS
        });
      } catch (err) {
        console.error("AI ERROR:", err);

        io.emit("conflict-detected", {
          conflict,
          aiSuggestion: null,
        });
      }
    } else {
      io.emit("conflict-detected", null);
    }
  });
  socket.on("disconnect", () => {
    delete userCodeMap[socket.id];
    delete userFunctionsMap[socket.id];

    console.log("❌ User disconnected:", socket.id);
  });
});

app.post("/run-project", (req, res) => {
  const { files } = req.body;

  console.log("🔥 Received files:");
  console.log(files);

  // 🔥 1. Create project folder
  const projectPath = path.join(__dirname, "temp-project");

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  // 🔥 2. Write ALL files FIRST
  for (const fileName in files) {
    const filePath = path.join(projectPath, fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 🔥 FORCE CORRECT PACKAGE.JSON
    if (fileName === "package.json") {
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          {
            name: "demo",
            version: "1.0.0",
            scripts: {
              dev: "node src/index.js", // 🔥 FORCE NODE
            },
          },
          null,
          2,
        ),
      );
    } else {
      fs.writeFileSync(filePath, files[fileName]);
    }
  }

  console.log("🔥 Files written to disk");

  // 🔥 3. RUN PROJECT (ONLY ONCE)
  const command = "npm install && npm run dev";

  if (currentProcess) {
    currentProcess.kill();
  }

  // 🔥 start new process
  currentProcess = exec(command, { cwd: projectPath });

  // 🔥 stream output LIVE
  currentProcess.stdout.on("data", (data) => {
    const message = data.toString();

    console.log("📦 BACKEND LOG:", message); // 🔥 ADD THIS

    io.emit("terminal-output", message);
  });
  currentProcess.stderr.on("data", (data) => {
    const message = data.toString();
    console.error("❌", message);

    // 🔥 SEND TO FRONTEND
    io.emit("terminal-output", message);
  });
});
// Run on DIFFERENT PORT than Yjs
server.listen(5000, () => {
  console.log("Socket server running on port 5000");
});
