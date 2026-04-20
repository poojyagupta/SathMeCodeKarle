const http = require("http");
const { Server } = require("socket.io");

// Create HTTP server
const server = http.createServer();

// Attach socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let currentProject = {
  projectId: "abc",
  files: {
    "package.json": "file:package.json",
    "src/index.js": "file:src/index.js",
  },
};

io.on("connection", (socket) => {
  // 🔥 send project to new user
  socket.on("request-project", () => {
    socket.emit("project-update", currentProject);
  });

  socket.on("project-update", (project) => {
    currentProject = project;
    socket.broadcast.emit("project-update", project);
  });
});

// Run on DIFFERENT PORT than Yjs
server.listen(5000, () => {
  console.log("Socket server running on port 5000");
});
