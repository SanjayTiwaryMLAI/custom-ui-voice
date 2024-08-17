import { FC, memo, useContext, useState } from "react";
import { Button, Container, Icon } from "@cloudscape-design/components";
import HomeContext from "../home/home.context";
import { MessageWithSource, FeedbackData, Message } from "../types/chat";
import { MemoizedReactMarkdown } from "./MemoizedReactMarkdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlock } from "./CodeBlock";
import { Components } from "react-markdown";
import { SourceDocumentModal } from "./sourceDocument";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

import "./chat/chat.css";

export interface Props {
  message: MessageWithSource;
  messageIndex: number;
  displaySourceConfigFlag: boolean;
  messageList: any;
}

const MARKDOWN_COMPONENTS: Components = {
  code: ({ node, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || "");

    return match ? (
      <CodeBlock
        language={(match && match[1]) || ""}
        value={String(children).replace(/\n$/, "")}
        {...props}
      />
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  table: ({ children }) => {
    return <table>{children}</table>;
  },
  a: ({ node, ...props }) => {
    const { href, children } = props;
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
  th: ({ children }) => {
    return (
      <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white">
        {children}
      </th>
    );
  },
  td: ({ children }) => {
    return (
      <td className="break-words border border-black px-3 py-1">{children}</td>
    );
  },
};

export const ChatMessage: FC<Props> = memo(
  ({ message, messageIndex, displaySourceConfigFlag, messageList }) => {
    const {
      state: { selectedConversation, messageIsStreaming, loading },
    } = useContext(HomeContext);
    const [selectedIcon, setSelectedIcon] = useState<1 | 0 | null>(null);

    const displaySourceInResponse =
      displaySourceConfigFlag &&
      message.sourceDocuments &&
      message.sourceDocuments.length > 0;
    const showIcon =
      messageIndex === (selectedConversation?.messages.length ?? 0) - 1
        ? loading
        : false;
    const handleFeedback = (
      feedbackType: 1 | 0,
      idx: number,
      message: Message
    ) => {
      const completion = message.content;
      const feedbackData: any = {
        sessionId: uuidv4() as string,
        feedback: feedbackType,
        answer: completion,
        question: messageList[idx - 1].content,
      };
      addUserFeedback(feedbackData);
    };

    const addUserFeedback = async (feedbackData: FeedbackData) => {
      //console.log(feedbackData);

      await axios({
        method: "post",
        url: "https://ge857czzt6.execute-api.ap-south-1.amazonaws.com/test-rag/feedback",
        data: JSON.stringify(feedbackData),
      })
        // .then((response) => {
        //   console.log(response);
        // })
        .then((data) => {
          //console.log(data);
          console.log("Feedback Submitted!");
        })
        .catch((err) => {
          console.log(err.message);
        });
    };

    return (
      <>
        <div
          key={messageIndex}
          id={`${messageIndex}` + "_message"}
          className="mb-2"
        >
          <div
            className={`prose max-w-[80%] w-fit px-3 py-2 rounded-t-xl text-sm shadow-lg ${
              message.role === "user"
                ? "bg-[#5672DC] rounded-bl-xl ml-auto text-white"
                : "bg-[#F1F1F1]  rounded-br-xl text-[#393939]  "
            }`}
          >
            {message.role === "user" ? (
              <div>{message.content}</div>
            ) : (
              <>
                <div className="flex ">
                  <div className="flex-1">
                    <MemoizedReactMarkdown
                      className="prose-sm flex-1 wordBreak"
                      remarkPlugins={[remarkGfm, remarkMath]}
                      // disallowedElements={['a']} To allow links appear as hyperlinks
                      unwrapDisallowed
                      components={MARKDOWN_COMPONENTS}
                    >
                      {`${message.content}${
                        messageIsStreaming &&
                        messageIndex ===
                          (selectedConversation?.messages.length ?? 0) - 1
                          ? "▍"
                          : ""
                      }`}
                    </MemoizedReactMarkdown>
                  </div>
                  {displaySourceInResponse &&
                    message.sourceDocuments &&
                    message.sourceDocuments.length > 0 && (
                      <SourceDocumentModal
                        sourceDocumentsData={message.sourceDocuments}
                      ></SourceDocumentModal>
                    )}
                </div>
                {!showIcon && (
                  <div className="thumbsContainer">
                    {(selectedIcon === 1 || selectedIcon === null) && (
                      <Button
                        variant="icon"
                        iconName={
                          selectedIcon === 1 ? "thumbs-up-filled" : "thumbs-up"
                        }
                        onClick={() => {
                          handleFeedback(1, messageIndex, message);
                          setSelectedIcon(1);
                        }}
                      />
                    )}
                    {(selectedIcon === 0 || selectedIcon === null) && (
                      <Button
                        iconName={
                          selectedIcon === 0
                            ? "thumbs-down-filled"
                            : "thumbs-down"
                        }
                        variant="icon"
                        onClick={() => {
                          handleFeedback(0, messageIndex, message);
                          setSelectedIcon(0);
                        }}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </>
    );
  }
);
ChatMessage.displayName = "ChatMessage";
