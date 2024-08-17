import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

export async function getRuntimeConfig() {
  const runtimeConfig = await fetch("/runtimeConfig.json");
  return runtimeConfig.json();
}

function getDefaultPrompt(config: any) {
  return config.UseCaseConfig.LlmParams.PromptTemplate;
}
getRuntimeConfig().then(function (config) {
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  root.render(
    <React.StrictMode>
      <App
        socketUrl={config.SocketURL}
        defaultPromptTemplate={getDefaultPrompt(config)}
        RAGEnabled={config.UseCaseConfig.LlmParams.RAGEnabled}
        useCaseConfig={config.UseCaseConfig}
      />
    </React.StrictMode>
  );
});
