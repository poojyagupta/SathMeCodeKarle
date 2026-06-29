const { extractFunctions } = require("../utils/parser");
const { detectConflicts } = require("../services/conflictService");
const { getAISuggestion } = require("../services/aiService");
const { loadProject, saveProject } = require("../services/projectService");
const { addConflict } = require("../services/conflictQueue");

const userCodeMap = {};
const userFunctionsMap = {};

let currentProject = loadProject();

function setupCollaboration(io) {
  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // SEND PROJECT
    socket.on("request-project", () => {
      socket.emit("project-update", currentProject);
    });

    // PROJECT UPDATE
    socket.on("project-update", (project) => {
      currentProject = project;

      saveProject(project);

      socket.broadcast.emit("project-update", project);
    });

    // CODE CHANGE
    socket.on("code-change", async ({ fileName, code }) => {
      if (!userCodeMap[socket.id]) {
        userCodeMap[socket.id] = {};
      }

      userCodeMap[socket.id][fileName] = code;

      const parsed = extractFunctions(code);

      const functions = parsed.functions.filter((fn) => fn.body.trim() !== "");

      if (!userFunctionsMap[socket.id]) {
        userFunctionsMap[socket.id] = {};
      }

      if (parsed.success) {
        userFunctionsMap[socket.id][fileName] = functions;
      }

      console.log(`🧠 Functions for ${socket.id}:`, functions);

      const conflicts = detectConflicts(userFunctionsMap);

      if (conflicts.length > 0) {
        console.log("🚨 CONFLICT DETECTED:", conflicts);

        for (const conflict of conflicts) {
          try {
            const aiSuggestion = await getAISuggestion(conflict);

            const queueItem = {
              id: Date.now(),
              function: conflict.function,
              users: conflict.users,
              changes: conflict.changes,
              aiSuggestion,
              timestamp: new Date().toISOString(),
              status: "pending",
            };

            addConflict(queueItem);

            io.emit("conflict-detected", {
              conflict,
              aiSuggestion,
              fileName: conflict.changes[0]?.file,
            });
          } catch (err) {
            const queueItem = {
              id: Date.now(),
              function: conflict.function,
              users: conflict.users,
              changes: conflict.changes, // NEW
              aiSuggestion: null,
              timestamp: new Date().toISOString(),
              status: "pending",
            };
            addConflict(queueItem);

            io.emit("conflict-detected", {
              conflict,
              aiSuggestion: null,
            });
          }
        }
      } else {
        io.emit("conflict-detected", null);
      }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      delete userCodeMap[socket.id];
      delete userFunctionsMap[socket.id];

      console.log("❌ User disconnected:", socket.id);
    });
  });
}

module.exports = setupCollaboration;
