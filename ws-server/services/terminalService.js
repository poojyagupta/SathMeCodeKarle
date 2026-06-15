const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

let currentProcess = null;

async function runProject(files, io) {
  console.log("🔥 Received files:");
  console.log(files);

  const projectPath = path.join(__dirname, "../temp-project");

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  for (const fileName in files) {
    const filePath = path.join(projectPath, fileName);

    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fileName === "package.json") {
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          {
            name: "demo",
            version: "1.0.0",
            scripts: {
              dev: "node src/index.js",
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

  const command = "npm install && npm run dev";

  if (currentProcess) {
    currentProcess.kill();
  }

  currentProcess = exec(command, {
    cwd: projectPath,
  });

  currentProcess.stdout.on("data", (data) => {
    const message = data.toString();

    console.log("📦 BACKEND LOG:", message);

    io.emit("terminal-output", message);
  });

  currentProcess.stderr.on("data", (data) => {
    const message = data.toString();

    console.error(message);

    io.emit("terminal-output", message);
  });
}

module.exports = {
  runProject,
};
