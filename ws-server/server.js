const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "project.json");

// Create HTTP server
const server = http.createServer();

// Attach socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

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

// Run on DIFFERENT PORT than Yjs
server.listen(5000, () => {
  console.log("Socket server running on port 5000");
});
