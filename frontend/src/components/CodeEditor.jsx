//monaco code wrapper
"use client"; //this is a client only component
import Editor from "@monaco-editor/react";
import * as Y from "yjs"; //for the yjs doc
import { useRef, useState, useEffect } from "react"; //for the persistent boxes to store the yjs doc, text, and observer flag
import { WebsocketProvider } from "y-websocket"; //for the websocket provider to sync the yjs doc with the server
import { io } from "socket.io-client";
function CodeEditor({ currentFile, socket }) {
  const ydoc = useRef(null); //persistent box created for the yjs doc
  const ytext = useRef(null); //persistent box created for the yjs text
  const applyingRemoteUpdate = useRef(false); //persistent box created for the yjs observer
  const provider = useRef(null); //persistent box created for the websocket provider
  const filesRef = useRef(null); // to store the file system structure in the future, for now it's just a placeholder
  const awareness = useRef(null); //persistent box created for the yjs awareness, cursors and presence
  const user = useRef(null); //persistent box created for the user info, name and color. stable container for this user's identity
  const decorations = useRef([]); //persistent box created for the cursor decorations in the editor
  const [onlineCount, setOnlineCount] = useState(1);
  const MonacoBindingRef = useRef(null); // to store the MonacoBinding instance
  const awarenessAttached = useRef(false);

  useEffect(() => {
    import("y-monaco").then((mod) => {
      MonacoBindingRef.current = mod.MonacoBinding;
    });
  }, []);

  if (!ydoc.current) {
    ydoc.current = new Y.Doc(); //created the yjs doc and stored it in the ref box. object created
    console.log("Y.doc created");
  }

  if (!provider.current) {
    provider.current = new WebsocketProvider(
      "ws://localhost:1234", // url of websocket server
      "jaiHo", // room name
      ydoc.current, // the yjs doc to be synced
    );

    awareness.current = provider.current.awareness; // store awareness properly
    console.log("Provider created");
  }

  if (!filesRef.current) {
    filesRef.current = ydoc.current.getMap("files"); //created a yjs map to store the file system structure in the future, and stored it in the ref box
    console.log("files map created");

    if (typeof window !== "undefined") {
      window.files = filesRef.current; //expose it to the window for debugging
    }
  }

  const fileKey = "file:" + currentFile;

  if (!filesRef.current.has(currentFile)) {
    filesRef.current.set(currentFile, fileKey);
    console.log(`${currentFile} registered`);
  }

  // 🔥 THIS IS THE KEY FIX
  ytext.current = ydoc.current.getText(fileKey);
  useEffect(() => {
    if (!ytext.current) return;

    let timeout;

    const observer = () => {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        const code = ytext.current.toString();

        socket?.emit("code-change", {
          fileName: currentFile,
          code,
        });

        console.log("🚀 Code sent (debounced):", currentFile);
      }, 700); // wait till user stops typing
    };

    ytext.current.observe(observer);

    return () => {
      ytext.current.unobserve(observer);
    };
  }, [currentFile]);
  console.log(`${currentFile} Y.Text ready:`, ytext.current);

  if (typeof window !== "undefined") {
    window.mainText = ytext.current;
  }
  if (!user.current) {
    const username = "user" + Math.floor(Math.random() * 1000); //generate random username
    const color =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0"); // ensure 6-digit hex
    user.current = { name: username, color: color }; //store em in the user ref
  }
  console.log("Current user:", user.current);

  // publish local user identity to awareness (run once)
  if (awareness.current && !awareness.current.getLocalState()?.user) {
    awareness.current.setLocalStateField("user", {
      name: user.current.name,
      color: user.current.color,
    });

    console.log(
      "Awareness set with user info:",
      awareness.current.getLocalState(),
    );
  }

  if (!ytext.current) {
    const fileKey = filesRef.current.get("main.js"); // "file:main.js"
    ytext.current = ydoc.current.getText(fileKey);
    console.log("Editor attached to:", fileKey);
  }

  const content = ytext.current.toString(); //This reads the current value of Y.Text as a string
  const getAllFilesContent = () => {
    const filesContent = {};

    filesRef.current.forEach((key, fileName) => {
      const ytext = ydoc.current.getText(key);
      filesContent[fileName] = ytext.toString();
    });

    return filesContent;
  };

  if (typeof window !== "undefined") {
    window.getProjectFiles = getAllFilesContent;
  }

  const getLanguage = (fileName) => {
    if (fileName.endsWith(".js")) return "javascript";
    if (fileName.endsWith(".html")) return "html";
    if (fileName.endsWith(".json")) return "json";
    if (fileName.endsWith(".css")) return "css";
    return "plaintext";
  };
  return (
    <>
      {/* ---- Presence UI ---- */}
      <div style={{ padding: 8, fontSize: 14 }}></div>

      <Editor
        height="70vh"
        language={getLanguage(currentFile)}
        defaultValue=""
        theme="vs-dark"
        onMount={(editor, monaco) => {
          const model = editor.getModel();

          if (!MonacoBindingRef.current) return;

          const binding = new MonacoBindingRef.current(
            ytext.current,
            model,
            new Set([editor]),
            awareness.current,
          );
          // ---- Helper: offset → Monaco position ----
          const offsetToPosition = (offset) => {
            return model.getPositionAt(offset);
          };

          // ---- Monaco → Yjs ----

          // ---- Yjs → Monaco ----

          // ---- Cursor → Awareness (LOCAL USER CURSOR BROADCAST) ----
          const cursorDisposable = editor.onDidChangeCursorSelection(() => {
            const selection = editor.getSelection();
            if (!selection) return;

            const startIndex = model.getOffsetAt(selection.getStartPosition());
            const endIndex = model.getOffsetAt(selection.getEndPosition());

            awareness.current.setLocalStateField("cursor", {
              anchor: startIndex,
              head: endIndex,
            });

            console.log("Cursor broadcast:", { startIndex, endIndex });
          });

          // ---- Awareness listener (REMOTE CURSORS + PRESENCE) ----
          const handleAwarenessChange = () => {
            const states = awareness.current.getStates();

            queueMicrotask(() => {
              setOnlineCount(states.size);
            });

            const newDecorations = [];

            states.forEach((state, clientId) => {
              // ❌ skip self
              if (clientId === awareness.current.clientID) return;
              if (!state.cursor) return;

              const { anchor, head } = state.cursor;
              const userInfo = state.user || {
                name: "unknown",
                color: "#ff0000",
              };

              const startPos = offsetToPosition(anchor);
              const endPos = offsetToPosition(head);

              const cursorClass = `remote-cursor-${clientId}`;

              // inject style once
              if (!document.getElementById(cursorClass)) {
                const style = document.createElement("style");
                style.id = cursorClass;
                style.innerHTML = `
        .${cursorClass} {
          border-left: 2px solid ${userInfo.color};
          margin-left: -1px;
          pointer-events: none;
        }
      `;
                document.head.appendChild(style);
              }

              newDecorations.push({
                range: new monaco.Range(
                  startPos.lineNumber,
                  startPos.column,
                  endPos.lineNumber,
                  endPos.column,
                ),
                options: {
                  className: "remote-selection",
                  afterContentClassName: cursorClass,
                  hoverMessage: { value: userInfo.name },
                },
              });
            });

            decorations.current = editor.deltaDecorations(
              decorations.current,
              newDecorations,
            );
          };

          if (!awarenessAttached.current) {
            awareness.current.on("change", handleAwarenessChange);
            awarenessAttached.current = true;
          }

          editor.onDidDispose(() => {
            try {
              cursorDisposable.dispose();
            } catch (e) {
              console.warn("Cursor cleanup error:", e);
            }

            if (awarenessAttached.current) {
              try {
                awareness.current.off("change", handleAwarenessChange);
              } catch (e) {
                console.warn("Awareness off error:", e);
              }
              awarenessAttached.current = false;
            }
          });
        }}
      />
    </>
  );
}

export default CodeEditor;
