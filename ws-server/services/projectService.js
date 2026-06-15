// services/projectService.js

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "../project.json");

function loadProject() {
  if (fs.existsSync(DATA_PATH)) {
    return JSON.parse(fs.readFileSync(DATA_PATH));
  }

  return {
    projectId: "abc",
    files: {
      "package.json": "file:package.json",
      "src/index.js": "file:src/index.js",
    },
  };
}

function saveProject(project) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(project, null, 2));
}

module.exports = {
  loadProject,
  saveProject,
};
