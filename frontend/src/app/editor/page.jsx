"use client";

import { useState } from "react";
import CodeEditor from "../../components/CodeEditor";

export default function Page() {
  // 🔹 Project state (ALL files live here)
  const [project, setProject] = useState({
    projectId: "abc",
    files: {
      "package.json": JSON.stringify(
        {
          name: "demo",
          scripts: { dev: "next dev" },
        },
        null,
        2,
      ),
      "src/index.js": "console.log('hello world');",
    },
  });

  // 🔹 Currently open file
  const [currentFile, setCurrentFile] = useState("package.json");

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 📁 FILE TREE */}
      <div
        style={{
          width: "220px",
          borderRight: "1px solid #ccc",
          padding: "10px",
        }}
      >
        <h4>Files</h4>

        {Object.keys(project.files).map((file) => (
          <div
            key={file}
            onClick={() => setCurrentFile(file)}
            style={{
              padding: "5px",
              cursor: "pointer",
              background: currentFile === file ? "#eee" : "transparent",
            }}
          >
            {file}
          </div>
        ))}
      </div>

      {/* 🧠 EDITOR */}
      <CodeEditor key={currentFile} currentFile={currentFile} />
    </div>
  );
}
