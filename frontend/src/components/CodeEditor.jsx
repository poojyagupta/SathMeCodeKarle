//monaco code wrapper
"use client"; //this is a client only component
import Editor from "@monaco-editor/react";

function CodeEditor() {
  return (
    <Editor
      height="400vh"
      defaultLanguage="javascript"
      defaultValue="//write your code here"
      theme="vs-dark"
    />
  );
}

export default CodeEditor;
