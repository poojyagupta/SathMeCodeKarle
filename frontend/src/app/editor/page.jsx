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

  const handleRenameFile = (oldName) => {
    if (!project) return;

    const newName = prompt("Enter new file name:", oldName);
    if (!newName || newName === oldName) return;

    // ❌ avoid duplicate names
    if (project.files[newName]) {
      alert("File already exists");
      return;
    }

    const updatedFiles = { ...project.files };

    // 🔥 IMPORTANT: preserve Yjs key
    updatedFiles[newName] = updatedFiles[oldName];
    delete updatedFiles[oldName];

    const updatedProject = {
      ...project,
      files: updatedFiles,
    };

    setProject(updatedProject);
    socketRef.current.emit("project-update", updatedProject);

    // 🔥 if renamed file is open
    if (currentFile === oldName) {
      setCurrentFile(newName);
    }
  };
  const handleDeleteFile = (fileName) => {
    if (!project) return;

    const updatedFiles = { ...project.files };
    delete updatedFiles[fileName];

    // 🔥 Edge case: if current file deleted
    let newCurrentFile = currentFile;

    if (fileName === currentFile) {
      const remainingFiles = Object.keys(updatedFiles);
      newCurrentFile = remainingFiles.length > 0 ? remainingFiles[0] : null;
    }

    const updatedProject = {
      ...project,
      files: updatedFiles,
    };

    const handleRenameFile = (oldName) => {
      if (!project) return;

      const newName = prompt("Enter new file name:", oldName);
      if (!newName || newName === oldName) return;

      // ❌ avoid duplicate names
      if (project.files[newName]) {
        alert("File already exists");
        return;
      }

      const updatedFiles = { ...project.files };

      // 🔥 IMPORTANT: preserve Yjs key
      updatedFiles[newName] = updatedFiles[oldName];
      delete updatedFiles[oldName];

      const updatedProject = {
        ...project,
        files: updatedFiles,
      };

      setProject(updatedProject);
      socketRef.current.emit("project-update", updatedProject);

      // 🔥 if renamed file is open
      if (currentFile === oldName) {
        setCurrentFile(newName);
      }
    };
    setProject(updatedProject);
    socketRef.current.emit("project-update", updatedProject);

    setCurrentFile(newCurrentFile);
  };
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
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px",
              background: currentFile === file ? "#eee" : "transparent",
            }}
          >
            <span
              style={{ cursor: "pointer" }}
              onClick={() => setCurrentFile(file)}
            >
              {file}
            </span>

            <div>
              {/* ✏️ Rename */}
              <button onClick={() => handleRenameFile(file)}>✏️</button>

              {/* ❌ Delete */}
              <button onClick={() => handleDeleteFile(file)}>x</button>
            </div>
          </div>
        ))}
      </div>

      {/* 🧠 EDITOR */}
      <CodeEditor key={currentFile} currentFile={currentFile} />
    </div>
  );
}
