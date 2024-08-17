import React, { MutableRefObject, useContext, useState, useEffect, useRef } from "react";
import {
  StatusIndicator,
  StatusIndicatorProps
} from "@cloudscape-design/components";
import HomeContext from "../home/home.context";
import { Message } from "../types/chat";
import { MODEL_MAX_INPUT_LENGTH } from "../utils/constants";
import { 
  TranscribeStreamingClient, 
  StartStreamTranscriptionCommand,
  StartStreamTranscriptionCommandInput,
  AudioStream
} from "@aws-sdk/client-transcribe-streaming";

interface Props {
  onSend: (message: Message) => void;
  stopConversationRef: MutableRefObject<boolean>;
  socketStatusType: StatusIndicatorProps.Type;
  socketStatusMessage: string;
}

export const ChatInput: React.FC<Props> = ({
  onSend,
  socketStatusType,
  socketStatusMessage,
}) => {
  const {
    state: { messageIsStreaming, loading },
  } = useContext(HomeContext);

  const [content, setContent] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcribeClient, setTranscribeClient] = useState<TranscribeStreamingClient | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const client = new TranscribeStreamingClient({
      region: "ap-south-1",
      credentials: {
        accessKeyId: 
        secretAccessKey:
      },
    });
    setTranscribeClient(client);

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MODEL_MAX_INPUT_LENGTH) {
      setContent(value);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageIsStreaming || loading || !content.trim()) {
      return;
    }
    onSend({ role: "user", content: content.trim() });
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSend(e);
    }
  };

  const startRecording = async () => {
    if (!transcribeClient) {
      console.error("Transcribe client is not initialized");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(mediaStream);
      audioChunksRef.current = [];
      setIsRecording(true);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          await processAudio();
        } catch (error) {
          console.error("Error processing audio:", error);
        } finally {
          setIsRecording(false);
        }
      };

      mediaRecorderRef.current.start();
      console.log("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log("Recording stopped");
    }
  };

  const processAudio = async () => {
    if (!transcribeClient) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
    const arrayBuffer = await audioBlob.arrayBuffer();

    const audioStream: AsyncIterable<AudioStream> = {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            return {
              done: false,
              value: {
                AudioEvent: {
                  AudioChunk: new Uint8Array(arrayBuffer)
                }
              }
            };
          }
        };
      }
    };

    const command: StartStreamTranscriptionCommandInput = {
      LanguageCode: "hi-IN",
      MediaEncoding: "pcm",
      MediaSampleRateHertz: 44100,
      AudioStream: audioStream
    };

    console.log("Sending transcription command...");
    try {
      const { TranscriptResultStream } = await transcribeClient.send(new StartStreamTranscriptionCommand(command));

      if (TranscriptResultStream) {
        for await (const event of TranscriptResultStream) {
          if (event.TranscriptEvent?.Transcript?.Results) {
            const results = event.TranscriptEvent.Transcript.Results;
            if (results[0] && results[0].Alternatives && results[0].Alternatives[0]) {
              const transcript = results[0].Alternatives[0].Transcript;
              if (transcript) {
                setContent((prevContent) => prevContent + " " + transcript);
              }
            }
          }
        }
      } else {
        console.error("No TranscriptResultStream received");
      }
    } catch (error) {
      console.error("Error in transcription:", error);
    }
  };

  return (
    <div className="w-full p-2 bg-white rounded-b-[10px]">
      <div className="mb-1 shadow px-5">
        <StatusIndicator type={socketStatusType}> {socketStatusMessage} </StatusIndicator>
      </div>
      <form className="flex items-center" onSubmit={handleSend}>
        <div className="w-full relative z-0">
          <input
            id="messageArea"
            name="messageArea"
            type="text"
            className="text-gray-900 text-sm rounded-focus:ring-blue-500 focus:outline-none focus:border-[#444BD3] block w-full p-2.5 rounded-lg border border-gray-300"
            placeholder="Type a message..."
            value={content}
            disabled={messageIsStreaming || loading}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="mx-2 flex align-middle">
          <button
            id="voiceButton"
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`mr-2 ${isRecording ? 'bg-red-500' : 'bg-blue-500'} text-white px-3 py-1 rounded`}
          >
            {isRecording ? 'Stop' : 'Voice'}
          </button>
          <button
            id="messageButton"
            type="submit"
            disabled={messageIsStreaming || loading || !content.trim()}
            className={`${
              messageIsStreaming || loading || !content.trim()
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                stroke="#667085"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}