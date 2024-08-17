import "./App.css";
import { useRef } from "react";

import { Chat } from "./components/chat/chat";
import HomeContext from "./home/home.context";
import { initialState } from "./home/home.state";
import { useCreateReducer } from "./hooks/useCreateReducer";
import { saveConversation } from "./utils/conversation";

function App({socketUrl, defaultPromptTemplate, RAGEnabled, useCaseConfig }: any) {
  initialState.defaultPromptTemplate = defaultPromptTemplate;
  initialState.promptTemplate = defaultPromptTemplate;
  initialState.RAGEnabled = RAGEnabled;
  initialState.useCaseConfig = useCaseConfig;
  const contextValue = useCreateReducer({
    initialState,
  });

  const { dispatch } = contextValue;

  const handleUpdateConversation = (conversation: any, data: any) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };
    saveConversation(updatedConversation);
    dispatch({ field: "selectedConversation", value: updatedConversation });
  };

  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        handleUpdateConversation,
      }}
    >
      <div className="w-screen h-screen bg-[url('https://d1.awsstatic.com/Digital%20Marketing/sitemerch/banners/Site-Merch_ML-Campaign_sagemaker-page_MidPage-Banner.95ef695268b52a7e51db1f141b14ca65647be40d.png')] bg-no-repeat bg-gray-800 bg-center">
        <Chat stopConversationRef={useRef(false)} socketUrl={socketUrl} />
      </div>
    </HomeContext.Provider>
  );
}

export default App;
