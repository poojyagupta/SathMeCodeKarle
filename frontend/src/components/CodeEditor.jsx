//monaco code wrapper
"use client"; //this is a client only component
import Editor from "@monaco-editor/react";
import * as Y from "yjs"; //for the yjs doc
import { useRef } from "react"; //for the persistent boxes to store the yjs doc, text, and observer flag
import { WebsocketProvider } from "y-websocket"; //for the websocket provider to sync the yjs doc with the server

function CodeEditor() {
  const ydoc = useRef(null); //persistent box created for the yjs doc
  const ytext = useRef(null); //persistent box created for the yjs text
  const applyingRemoteUpdate = useRef(false); //persistent box created for the yjs observer
  const provider = useRef(null); //persistent box created for the websocket provider
  const awareness = useRef(null); //persistent box created for the yjs awareness, cursors and presence
  const user = useRef(null); //persistent box created for the user info, name and color. stable container for this user's identity

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
    <Editor
      height="400vh"
      defaultLanguage="javascript"
      defaultValue={content}
      theme="vs-dark"
      onMount={(editor) => {
        const model = editor.getModel();

        // ---- Monaco → Yjs ----
        const disposable = model.onDidChangeContent((event) => {
          //this just listens for a change in the monaco editor
          if (applyingRemoteUpdate.current) return; //

          event.changes.forEach((change) => {
            const index = model.getOffsetAt(change.range.getStartPosition());

            if (change.rangeLength > 0) {
              ytext.current.delete(index, change.rangeLength);
            }

            if (change.text.length > 0) {
              ytext.current.insert(index, change.text);
            }

            console.log("Y.Text now:", ytext.current.toString());
          });
        });

        // ---- Yjs → Monaco ----
        const yObserver = () => {
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

          applyingRemoteUpdate.current = false;
        };

        ytext.current.observe(yObserver);

        // ---- Cleanup ----
        editor.onDidDispose(() => {
          disposable.dispose();
          ytext.current.unobserve(yObserver);
        });
      }}
    />
  );
}

export default CodeEditor;
