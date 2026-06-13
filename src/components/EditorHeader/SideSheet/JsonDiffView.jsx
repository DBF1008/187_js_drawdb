import { DiffEditor } from "@monaco-editor/react";
import { useSettings } from "../../../hooks";

export default function JsonDiffView({ contentA, contentB }) {
  const { settings } = useSettings();

  return (
    <DiffEditor
      original={contentB}
      modified={contentA}
      options={{ readOnly: true }}
      height="22rem"
      theme={settings.mode === "light" ? "vs" : "vs-dark"}
      language="json"
    />
  );
}
