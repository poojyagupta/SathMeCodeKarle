"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import CodeEditor from "../../components/CodeEditor";

export default function Page() {
  const socketRef = useRef(null);

  // 🔹 Project state
  const [project, setProject] = useState(null);

  // 🔹 Currently open file
  const [currentFile, setCurrentFile] = useState("package.json");

  // 🔥 CONNECT SOCKET
  useEffect(() => {
    socketRef.current = io("http://localhost:5000");

    socketRef.current.on("project-update", (updatedProject) => {
      setProject(updatedProject);

      // 🔥 force editor to rebind after project loads
      setTimeout(() => {
        setCurrentFile((prev) => prev);
      }, 50);
    });

    socketRef.current.emit("request-project");

    return () => socketRef.current.disconnect();
  }, []);

  // 🔥 LOADING GUARD (VERY IMPORTANT)
  if (!project) {
    return <div style={{ padding: "20px" }}>Loading project...</div>;
  }

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

        {/* 🔥 CREATE FILE INPUT */}
        <input
          placeholder="new file name"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const newFileName = e.target.value.trim();
              if (!newFileName) return;

              const updated = {
                ...project,
                files: {
                  ...project.files,
                  [newFileName]: "file:" + newFileName,
                },
              };

              setProject(updated);
              socketRef.current.emit("project-update", updated);

              setCurrentFile(newFileName);
              e.target.value = "";
            }
          }}
          style={{ width: "100%", marginBottom: "10px" }}
        />

        {/* 📁 FILE LIST */}
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
