import { FC, memo } from "react";
import { ChatMessage, Props } from "./ChatMessage";

export const MemoizedChatMessage: FC<Props> = memo(
  ChatMessage,
  (prevProps, nextProps) =>
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.sourceDocuments === nextProps.message.sourceDocuments
);
