//monaco code wrapper
"use client"; //this is a client only component
import Editor from "@monaco-editor/react";
import * as Y from "yjs"; //for the yjs doc
import { useRef } from "react"; //for the persistent boxes to store the yjs doc, text, and observer flag

function CodeEditor() {
  const ydoc = useRef(null); //persistent box created for the yjs doc
  const ytext = useRef(null); //persistent box created for the yjs text
  const applyingRemoteUpdate = useRef(false); //persistent box created for the yjs observer

  if (!ydoc.current) {
    ydoc.current = new Y.Doc(); //created the yjs doc and stored it in the ref box
    console.log("Y.doc created");
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
