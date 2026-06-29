"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import CodeEditor from "../../components/CodeEditor";

export default function Page() {
  const socketRef = useRef(null);

  const [project, setProject] = useState(null);
  const [currentFile, setCurrentFile] = useState("package.json");
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("terminal");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const terminalRef = useRef(null);
  const [conflicts, setConflicts] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [conflictFile, setConflictFile] = useState(null);
  const conflictTimer = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [conflictQueue, setConflictQueue] = useState([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  useEffect(() => {
    socketRef.current = io("http://localhost:5000");

    socketRef.current.on("project-update", (updatedProject) => {
      setProject(updatedProject);
      setTimeout(() => setCurrentFile((prev) => prev), 50);
    });

    socketRef.current.emit("request-project");

    socketRef.current.on("terminal-output", (data) => {
      console.log("FRONTEND RECEIVED:", data);

      setLogs((prev) => [...prev, data]);

      // 🔥 STOP RUNNING WHEN OUTPUT COMES
      setIsRunning(false);
    });
    const fetchConflicts = async () => {
      try {
        const response = await fetch("http://localhost:5000/conflicts");
        const data = await response.json();

        setConflictQueue(data);
      } catch (err) {
        console.error("Failed to fetch conflicts:", err);
      }
    };

    fetchConflicts();
    socketRef.current.on("conflict-detected", (data) => {
      if (!data) {
        setConflicts([]);
        setAiSuggestion(null);
        setConflictFile(null);
        return;
      }

      setConflicts([data.conflict]);
      setAiSuggestion(data.aiSuggestion);
      setConflictFile(data.fileName);

      fetch("http://localhost:5000/conflicts")
        .then((res) => res.json())
        .then((queue) => setConflictQueue(queue));

      if (conflictTimer.current) clearTimeout(conflictTimer.current);

      conflictTimer.current = setTimeout(() => {
        setConflicts([]);
        setAiSuggestion(null);
        setConflictFile(null);
      }, 5000);
    });

    return () => {
      socketRef.current.off("conflict-detected");
      if (conflictTimer.current) clearTimeout(conflictTimer.current);
    };
  }, []);

  if (!project) {
    return (
      <div style={{ padding: "20px", color: "#ccc" }}>Loading project...</div>
    );
  }

  const handleRenameFile = (oldName) => {
    const newName = prompt("Enter new file name:", oldName);
    if (!newName || newName === oldName) return;

    if (project.files[newName]) {
      alert("File already exists");
      return;
    }

    const updatedFiles = { ...project.files };
    updatedFiles[newName] = updatedFiles[oldName];
    delete updatedFiles[oldName];

    const updatedProject = { ...project, files: updatedFiles };

    setProject(updatedProject);
    socketRef.current.emit("project-update", updatedProject);

    if (currentFile === oldName) setCurrentFile(newName);
  };

  const handleDeleteFile = (fileName) => {
    const updatedFiles = { ...project.files };
    delete updatedFiles[fileName];

    let newCurrentFile = currentFile;
    if (fileName === currentFile) {
      const remaining = Object.keys(updatedFiles);
      newCurrentFile = remaining[0] || null;
    }

    const updatedProject = { ...project, files: updatedFiles };

    setProject(updatedProject);
    socketRef.current.emit("project-update", updatedProject);
    setCurrentFile(newCurrentFile);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      {/* 📁 SIDEBAR */}
      <div
        style={{
          width: "240px",
          background: "#020617",
          borderRight: "1px solid #1e293b",
          padding: "15px",
        }}
      >
        <button
          onClick={async () => {
            if (!window.getProjectFiles) return;

            const allFiles = window.getProjectFiles();
            const files = {};

            Object.keys(project.files).forEach((f) => {
              files[f] = allFiles[f] || "";
            });

            // 🔥 FORCE NODE EXECUTION (matches backend)
            files["package.json"] = JSON.stringify(
              {
                name: "demo",
                version: "1.0.0",
                scripts: {
                  dev: "node src/index.js",
                },
              },
              null,
              2,
            );

            setLogs([]);
            setIsRunning(true);

            await fetch("http://localhost:5000/run-project", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ files }),
            });

            // 🔥 switch to terminal (NOT preview)
            setActiveTab("terminal");
          }}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            background: "#22c55e",
            color: "black",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            marginBottom: "15px",
          }}
        >
          {isRunning ? "⏳ Running..." : "▶ Run Project"}
        </button>

        <h4 style={{ marginBottom: "10px" }}>Files</h4>

        <input
          placeholder="New file..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const name = e.target.value.trim();
              if (!name) return;

              const updated = {
                ...project,
                files: { ...project.files, [name]: "file:" + name },
              };

              setProject(updated);
              socketRef.current.emit("project-update", updated);
              setCurrentFile(name);
              e.target.value = "";
            }
          }}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #334155",
            background: "#020617",
            color: "white",
            marginBottom: "10px",
          }}
        />

        {Object.keys(project.files).map((file) => (
          <div
            key={file}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px",
              borderRadius: "6px",
              marginBottom: "5px",
              background: currentFile === file ? "#1e293b" : "transparent",
            }}
          >
            <span
              style={{ cursor: "pointer" }}
              onClick={() => setCurrentFile(file)}
            >
              {file}
            </span>

            <div>
              <button
                onClick={() => handleRenameFile(file)}
                style={{ marginRight: "5px" }}
              >
                ✏️
              </button>
              <button onClick={() => handleDeleteFile(file)}>❌</button>
            </div>
          </div>
        ))}
        <hr
          style={{
            marginTop: "15px",
            marginBottom: "15px",
            borderColor: "#334155",
          }}
        />

        <div
          onClick={() => setShowConflicts(!showConflicts)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            background: "#7f1d1d",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          ⚠ Conflicts ({conflictQueue.length})
        </div>
        {showConflicts && (
          <div
            style={{
              marginTop: "10px",
              background: "#1e293b",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px",
                fontWeight: "bold",
                borderBottom: "1px solid #334155",
              }}
            >
              Conflict Review Center
            </div>

            {conflictQueue.length === 0 ? (
              <div style={{ padding: "10px" }}>No conflicts found.</div>
            ) : (
              conflictQueue.map((conflict) => (
                <div
                  key={conflict.id}
                  onClick={() => setSelectedConflict(conflict)}
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid #334155",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{conflict.function}</div>

                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Status: {conflict.status}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {selectedConflict && (
          <div
            style={{
              marginTop: "10px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "10px",
              color: "white",
            }}
          >
            <h3>{selectedConflict.function}</h3>

            <pre>{selectedConflict.changes?.[0]?.body}</pre>

            <hr />

            <pre>{selectedConflict.changes?.[1]?.body}</pre>

            <hr />

            <div>
              {selectedConflict.aiSuggestion || "No AI suggestion available"}
            </div>
          </div>
        )}
      </div>

      {/* 🔥 MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* EDITOR */}
        <div style={{ flex: 1, borderBottom: "1px solid #1e293b" }}>
          <CodeEditor
            key={currentFile}
            currentFile={currentFile}
            socket={socketRef.current}
          />
        </div>

        {/* CONFLICT */}
        {conflicts.length > 0 && (
          <div
            style={{
              background: "#dc2626",
              padding: "10px",
              fontWeight: "bold",
            }}
          >
            ⚠ Conflict in {conflictFile} → function: {conflicts[0].function}
          </div>
        )}

        {/* AI */}
        {aiSuggestion && (
          <div
            style={{
              background: "#020617",
              padding: "10px",
              fontFamily: "monospace",
              borderTop: "1px solid #334155",
            }}
          >
            🤖 AI Suggestion:
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {aiSuggestion.split("\n").map((line, i) => (
                <div
                  key={i}
                  style={{
                    background: line.includes("+")
                      ? "#144d14"
                      : line.includes("-")
                        ? "#5a1a1a"
                        : "transparent",
                  }}
                >
                  {line}
                </div>
              ))}
            </pre>
            <button
              style={{
                marginTop: "10px",
                padding: "6px 12px",
                background: "#22c55e",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              onClick={() => {
                if (!window.getProjectFiles) return;
                const files = window.getProjectFiles();

                files[conflictFile] = aiSuggestion;

                socketRef.current.emit("project-update", {
                  ...project,
                  files,
                });

                setConflicts([]);
                setAiSuggestion(null);
                setConflictFile(null);
              }}
            >
              Apply Fix
            </button>
          </div>
        )}

        {/* TERMINAL */}
        <div style={{ height: "250px", background: "#020617" }}>
          <div
            style={{
              padding: "10px",
              borderBottom: "1px solid #1e293b",
              fontWeight: "bold",
            }}
          >
            🖥 Terminal
          </div>

          <div
            ref={terminalRef}
            style={{
              height: "100%",
              padding: "10px",
              overflowY: "auto",
              fontFamily: "monospace",
              color: "#22c55e",
            }}
          >
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
