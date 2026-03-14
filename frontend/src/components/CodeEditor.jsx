//monaco code wrapper
"use client"; //this is a client only component
import Editor from "@monaco-editor/react";
import * as Y from "yjs"; //for the yjs doc
import { useRef, useState } from "react"; //for the persistent boxes to store the yjs doc, text, and observer flag
import { WebsocketProvider } from "y-websocket"; //for the websocket provider to sync the yjs doc with the server

function CodeEditor() {
  const ydoc = useRef(null); //persistent box created for the yjs doc
  const ytext = useRef(null); //persistent box created for the yjs text
  const applyingRemoteUpdate = useRef(false); //persistent box created for the yjs observer
  const provider = useRef(null); //persistent box created for the websocket provider
  const filesRef = useRef(null); // to store the file system structure in the future, for now it's just a placeholder
  const awareness = useRef(null); //persistent box created for the yjs awareness, cursors and presence
  const user = useRef(null); //persistent box created for the user info, name and color. stable container for this user's identity
  const decorations = useRef([]); //persistent box created for the cursor decorations in the editor
  const [onlineCount, setOnlineCount] = useState(1);

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
    ytext.current = ydoc.current.getText("editor"); //created the yjs text and stored it in the ref box
    console.log("Y.text created");
  }

  const content = ytext.current.toString(); //This reads the current value of Y.Text as a string

  return (
    <>
      {/* ---- Presence UI ---- */}
      <div style={{ padding: 8, fontSize: 14 }}>Online: {onlineCount}</div>

      <Editor
        height="400vh"
        defaultLanguage="javascript"
        defaultValue={content}
        theme="vs-dark"
        onMount={(editor, monaco) => {
          const model = editor.getModel();

          // ---- Helper: offset → Monaco position ----
          const offsetToPosition = (offset) => {
            return model.getPositionAt(offset);
          };

          // ---- Monaco → Yjs ----
          const disposable = model.onDidChangeContent((event) => {
            //this just listens for a change in the monaco editor
            if (applyingRemoteUpdate.current) return; //

            ydoc.current.transact(() => {
              //wrap the changes in a yjs transaction to batch them together and optimize performance
              const reverseChanges = [...event.changes].reverse(); //reverse the changes to apply them from the end of the document to the beginning, to avoid messing up the indices

              reverseChanges.forEach((change) => {
                const index = model.getOffsetAt(
                  change.range.getStartPosition(),
                );

                if (change.rangeLength > 0) {
                  ytext.current.delete(index, change.rangeLength);
                }

                if (change.text.length > 0) {
                  ytext.current.insert(index, change.text);
                }

                console.log("Y.Text now:", ytext.current.toString());
              });
            });
          });

          // ---- Yjs → Monaco ----
          const yObserver = () => {
            const selection = editor.getSelection();
            const yValue = ytext.current.toString();
            const editorValue = model.getValue();

            if (yValue === editorValue) return; //to see if the change is local or remote. if local then the yValue and editorValue will be the same, so we can skip the update

            applyingRemoteUpdate.current = true;

            model.pushEditOperations(
              [],
              [
                {
                  range: model.getFullModelRange(),
                  text: yValue,
                },
              ],
              () => null,
            );
            if (selection) {
              editor.setSelection(selection);
            }
            applyingRemoteUpdate.current = false;
          };

          ytext.current.observe(yObserver);

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
          const awarenessListener = awareness.current.on("change", () => {
            const states = awareness.current.getStates();

            // ✅ update presence count
            setOnlineCount(states.size);

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

              // 🔥 dynamic cursor class per user
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
                  stickiness: 1,
                  inlineClassName: undefined,
                  hoverMessage: { value: userInfo.name },
                },
              });
            });

            decorations.current = editor.deltaDecorations(
              decorations.current,
              newDecorations,
            );
          });

          // ---- Cleanup ----
          editor.onDidDispose(() => {
            disposable.dispose();
            ytext.current.unobserve(yObserver);
            cursorDisposable.dispose();
            awarenessListener();
          });
        }}
      />
    </>
  );
}

export default CodeEditor;
