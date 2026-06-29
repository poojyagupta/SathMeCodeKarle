const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const setupCollaboration = require("./sockets/collaboration");
const createRunProjectRoute = require("./routes/runProject");
const conflictsRoute = require("./routes/conflicts");
const app = express();

app.use(express.json());
app.use(cors());
app.use("/conflicts", conflictsRoute);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use("/run-project", createRunProjectRoute(io));

setupCollaboration(io);

server.listen(5000, () => {
  console.log("Socket server running on port 5000");
});
