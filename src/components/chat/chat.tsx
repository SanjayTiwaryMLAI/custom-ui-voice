import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import RAGLOGO from "../../assets/RAG_Logo.png";
import AWS from "aws-sdk";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import { TranscribeStreamingClient } from "@aws-sdk/client-transcribe-streaming";
import {
  CLIENTID,
  END_CONVERSATION_TOKEN,
  PASSWORD,
  SOURCE_DOCS_RESPONSE_PAYLOAD_KEY,
  USERNAME,
  USERPOOLID,
} from "../../utils/constants";
import HomeContext from "../../home/home.context";
import {
  Conversation,
  Message,
  MessageWithSource,
  SourceDocument,
} from "../../types/chat";
import { saveConversation } from "../../utils/conversation";
import "./chat.css";
import {
  StatusIndicator,
  StatusIndicatorProps,
} from "@cloudscape-design/components";
import { ChatInput } from "../ChatInput";
import { MemoizedChatMessage } from "../MemoizedChatMessage";

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
  socketUrl: string;
}

export const Chat = memo(({ stopConversationRef, socketUrl }: Props) => {
  const {
    state: { selectedConversation, promptTemplate, useCaseConfig },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [showChatButton, setShowChatButton] = useState(false);
  const messageRef = useRef<HTMLInputElement>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [socketState, setSocketState] = useState<number>(WebSocket.CLOSED);
  const updatedConversationRef = useRef(selectedConversation);

  const displaySourceDocuments =
    useCaseConfig.KnowledgeBaseParams.ReturnSourceDocs;

  let socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    updatedConversationRef.current = selectedConversation;
    messageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation]);

  // Set up AWS configuration
  AWS.config.update({ region: "ap-south-1" });

  // Set up Transcribe client
  const transcribeClient = new TranscribeStreamingClient({
    region: "ap-south-1",
    credentials: {
      accessKeyId: ,
      secretAccessKey: ,
    },
  });

  // Define AWS Cognito credentials
  const poolData = {
    UserPoolId: USERPOOLID,
    ClientId: CLIENTID,
  };
  const userPool = new CognitoUserPool(poolData);

  // Define authentication function
  async function authenticateUser(username: string, password: string) {
    const authenticationData = {
      Username: username,
      Password: password,
    };
    const authenticationDetails = new AuthenticationDetails(authenticationData);
    const userData = {
      Username: username,
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    try {
      const result: any = await new Promise((resolve, reject) => {
        cognitoUser.authenticateUser(authenticationDetails, {
          onSuccess: function (result) {
            resolve(result);
          },
          onFailure: function (err) {
            reject(err);
          },
        });
      });
      return result.getAccessToken().getJwtToken();
    } catch (err) {
      console.error("Authentication failed:", err);
      throw err;
    }
  }

  const connectWebSocket = useCallback(
    async (firstConnection = false) => {
      try {
        if (showChatButton) {
          const authToken = await authenticateUser(USERNAME, PASSWORD);
          const newSocket = new WebSocket(
            socketUrl + "?Authorization=" + authToken
          );

          setSocketState(WebSocket.CONNECTING);
          socketRef.current = newSocket;
          newSocket.addEventListener("open", () => {
            setSocketState(WebSocket.OPEN);
          });

          newSocket.addEventListener("close", () => {
            setSocketState(WebSocket.CLOSED);
          });

          newSocket.addEventListener("error", (error) => {
            console.error("Socket error: ", error);
            setSocketState(4);
          });
        }
      } catch (error) {
        console.error("Websocket connection error: ", error);
      }
    },
    [socketUrl, showChatButton]
  );

  const getSocket = useCallback(async () => {
    let socket: WebSocket | null = socketRef.current;
    if (!socket || socket?.readyState !== WebSocket.OPEN) {
      setSocketState(WebSocket.CONNECTING);
      await connectWebSocket();
      socket = socketRef.current;
      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
      let counter = 0;
      while (socket?.readyState === WebSocket.CONNECTING && counter < 15) {
        await delay(1000);
        counter += 1;
      }
      if (socket && socket?.readyState === WebSocket.OPEN) {
        setSocketState(WebSocket.OPEN);
      } else {
        setSocketState(4);
        console.error("Socket is still not connected. Cannot send message.");
      }
    }
    return socketRef.current;
  }, [connectWebSocket]);

  useEffect(() => {
    connectWebSocket(true);

    return () => {
      const socket = socketRef.current;
      if (socket) {
        socket.close();
        socketRef.current = null;
      }
    };
  }, [connectWebSocket]);

  useEffect(() => {
    if (timeLeft === 0) {
      setTimeLeft(null);
    }
    if (!timeLeft) return;
    const intervalId = setInterval(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft, showChatButton]);

  const handleSend = useCallback(
    async (message: Message) => {
      try {
        let socket = await getSocket();
        if (
          selectedConversation &&
          socket &&
          socket?.readyState === WebSocket.OPEN
        ) {
          let updatedConversation: Conversation;
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
          };
          homeDispatch({
            field: "selectedConversation",
            value: updatedConversation,
          });
          updatedConversationRef.current = updatedConversation;
          homeDispatch({ field: "loading", value: true });
          homeDispatch({ field: "messageIsStreaming", value: true });
          const response = new Response(JSON.stringify(""), {
            status: 200,
            statusText: "ok",
          });

          let isFirst = true;

          socket.onmessage = (event) => {
            homeDispatch({ field: "messageIsStreaming", value: true });
            homeDispatch({ field: "loading", value: true });
            setTimeout(() => {
              processResponse(event);
            }, 70);
            isFirst = false;
          };

          let payload = {
            action: "sendMessage",
            question: message.content,
            conversationId: selectedConversation.id,
            promptTemplate: promptTemplate,
          };

          socket.send(JSON.stringify(payload));

          const data = response.body;
          if (!data) {
            homeDispatch({ field: "loading", value: false });
            homeDispatch({ field: "messageIsStreaming", value: false });
            return;
          }
          const reader = data.getReader();
          let done = false;

          while (!done) {
            const { done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = "";
            const initSourceDocuments: SourceDocument[] = [];
            if (isFirst) {
              isFirst = false;
              const updatedMessages: MessageWithSource[] = [
                ...updatedConversation.messages,
                {
                  role: "assistant",
                  content: chunkValue,
                  sourceDocuments: initSourceDocuments,
                },
              ];
              updatedConversation = {
                ...updatedConversation,
                messages: updatedMessages,
              };
              homeDispatch({
                field: "selectedConversation",
                value: updatedConversation,
              });
              updatedConversationRef.current = updatedConversation;
            }
          }
          saveConversation(updatedConversation);
          homeDispatch({ field: "messageIsStreaming", value: false });
        }
      } catch (error) {
        console.error("Error while sending message: ", error);
      }
    },
    [selectedConversation, stopConversationRef, getSocket, promptTemplate]
  );

  const isStreamingComplete = (response: any) => {
    return (
      !response.data ||
      response.data === END_CONVERSATION_TOKEN ||
      response.errorMessage === END_CONVERSATION_TOKEN
    );
  };

  const isSendingReferences = (response: any) => {
    return (
      displaySourceDocuments &&
      response[SOURCE_DOCS_RESPONSE_PAYLOAD_KEY] !== undefined
    );
  };

  const parseReferenceOutput = (response: any): SourceDocument | undefined => {
    const sourceDocsResponse = response[SOURCE_DOCS_RESPONSE_PAYLOAD_KEY];
    return sourceDocsResponse as SourceDocument;
  };

  const processResponse = (event: any) => {
    let response = JSON.parse(event.data);

    if (!event.returnValue) {
      homeDispatch({ field: "loading", value: false });
      homeDispatch({ field: "messageIsStreaming", value: false });
      return;
    }
    let text = "";
    let sourceDocument: SourceDocument | undefined;

    if (response.errorMessage) {
      text += response.errorMessage;
      homeDispatch({ field: "messageIsStreaming", value: false });
      homeDispatch({ field: "loading", value: false });
    } else if (isSendingReferences(response)) {
      sourceDocument = parseReferenceOutput(response);
    } else if (isStreamingComplete(response)) {
      homeDispatch({ field: "messageIsStreaming", value: false });
      homeDispatch({ field: "loading", value: false });
      return;
    } else {
      text += response.data;
    }

    const updatedMessagesWithSource: MessageWithSource[] =
      updatedConversationRef.current!.messages.map(
        (message: any, index: any) => {
          if (index === updatedConversationRef.current!.messages.length - 1) {
            let updatedMessage = {
              ...message,
              content: message.content + text,
            };

            if (
              sourceDocument !== undefined &&
              Object.keys(sourceDocument).length > 0
            ) {
              updatedMessage.sourceDocuments = [
                ...message.sourceDocuments,
                sourceDocument,
              ];
            }
            return updatedMessage;
          }
          return message;
        }
      );

    const newUpdatedConversation = {
      ...updatedConversationRef.current!,
      messages: updatedMessagesWithSource,
      id: response.conversationId,
    };

    homeDispatch({
      field: "selectedConversation",
      value: newUpdatedConversation,
    });
    updatedConversationRef.current = newUpdatedConversation;
    saveConversation(newUpdatedConversation);
  };

  const resetChatbot = () => {
    if (selectedConversation && selectedConversation.messages.length) {
      const updatedConversation = {
        ...selectedConversation,
        messages: [],
        id: "",
      };
      saveConversation(updatedConversation);
      homeDispatch({
        field: "selectedConversation",
        value: updatedConversation,
      });
    }
  };

  const mountedStyle = { animation: "inAnimation 250ms ease-in" };
  const unmountedStyle = {
    animation: "outAnimation 270ms ease-out",
    animationFillMode: "forwards",
  };

  let socketStatusType: StatusIndicatorProps.Type = "loading";
  let socketStatusMessage = "Connecting";
  switch (socketState) {
    case WebSocket.OPEN:
      socketStatusType = "success";
      socketStatusMessage = "Connected";
      break;
    case WebSocket.CLOSED:
      socketStatusType = "stopped";
      socketStatusMessage =
        "Disconnected. Please send a message to initiate reconnection.";
      break;
    case 4:
      socketStatusType = "error";
      socketStatusMessage = "Unable to connect. Please refresh page.";
  }

  return (
    <div className="AskAI-chatarea">
      {showChatButton && (
        <div
          className="AskAI-chatBox bg-white "
          style={showChatButton ? mountedStyle : unmountedStyle}
        >
          <div className="bg-gradient-to-r from-[#232F3E] via-[#37475A] to-[#FF9900] h-[45px] rounded-[10px] flex items-center px-5 py-2">
            <div className="cursor-pointer">
              <img src={RAGLOGO} alt="User" width={30} height={30} />
            </div>
            <div className=" ml-2 mr-auto">
              <h3 className="text-md font-semibold text-white">AskAI</h3>
            </div>
            <button
              id="messageReset"
              type="button"
              title="Reset"
              className="mr-1"
              onClick={() => {
                resetChatbot();
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="icon icon-tabler icon-tabler-refresh"
                width="25"
                height="25"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="#FF9900"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
                <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
              </svg>
            </button>
          </div>
          <div className="bg-white h-[80%] overflow-auto">
            {selectedConversation?.messages.length == 0 ? (
              <div className="mt-2 transition-shadow">
                <div className="rounded-xl shadow-md ">
                  <div className="px-6 py-4">
                    <div className=" text-base">
                      <StatusIndicator
                        type={socketStatusType}
                      ></StatusIndicator>
                      {socketStatusMessage == "Connected"
                        ? "Hi, Welcome to Ask AI. Please ask your query"
                        : socketStatusMessage}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-3 py-1">
                {!!selectedConversation?.messages.length &&
                  selectedConversation?.messages.length > 0 && (
                                        <>
                                          {selectedConversation?.messages.map(
                                            (message: any, index: any) => (
                                              <MemoizedChatMessage
                                                key={index}
                                                message={message}
                                                messageIndex={index}
                                                displaySourceConfigFlag={true}
                                                messageList={selectedConversation?.messages}
                                              />
                                            )
                                          )}
                                          <div ref={messageRef}></div>
                                        </>
                                      )}
                                  </div>
                                )}
                              </div>
                              <ChatInput
                                stopConversationRef={stopConversationRef}
                                onSend={(message: any) => {
                                  handleSend(message);
                                }}
                                socketStatusType={socketStatusType}
                                socketStatusMessage={socketStatusMessage}
                                // transcribeClient={transcribeClient}
                              />
                            </div>
                          )}
                          {!showChatButton ? (
                            <button
                              id="chatbotStart"
                              type="button"
                              className="text-white bg-[#232F3E] focus:outline-none font-medium text-sm text-center rounded-t-2xl rounded-bl-2xl py-1.5 px-2.5 absolute right-8 bottom-3 transition-all flex items-center"
                              onClick={() => {
                                setShowChatButton(true);
                                connectWebSocket();
                              }}
                            >
                              <img src={RAGLOGO} alt="User" width={25} height={25} />
                              <span className="ml-1">AskAI</span>
                            </button>
                          ) : (
                            <button
                              id="chatbotClose"
                              type="button"
                              className="text-white bg-[#232F3E] focus:outline-none font-medium text-sm text-center rounded-3xl p-2 absolute right-8 bottom-3 transition-all"
                              onClick={() => {
                                setShowChatButton(false);
                                resetChatbot();
                              }}
                            >
                              <svg
                                height="22"
                                viewBox="0 0 23 23"
                                width="22"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12
                          13.41 17.59 19 19 17.59 13.41 12z"
                                  fill="white"
                                />
                                <path d="M0 0h24v24H0z" fill="none" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    });
                    
                    Chat.displayName = "Chat";
                  