const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const fs = require("fs");

const path = require("path");
const cors = require("cors");
const app = express();

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

    fs.writeFileSync(filePath, files[fileName]);
  }

  console.log("🔥 Files written to disk");

  // 🔥 3. RUN PROJECT (ONLY ONCE)
  const command = "npm install && npm run dev";

  // 🔥 kill previous process (VERY IMPORTANT)
  if (currentProcess) {
    currentProcess.kill();
  }

  // 🔥 start new process
  // 🔥 kill previous process (VERY IMPORTANT)
  if (currentProcess) {
    currentProcess.kill();
  }

  // 🔥 start new process
  currentProcess = exec(command, { cwd: projectPath });

  // 🔥 stream output LIVE
  currentProcess.stdout.on("data", (data) => {
    console.log("📦", data.toString());
  });

  currentProcess.stderr.on("data", (data) => {
    console.error("❌", data.toString());
  });

  res.json({ status: "project running" });
});
// Run on DIFFERENT PORT than Yjs
server.listen(5000, () => {
  console.log("Socket server running on port 5000");
});
