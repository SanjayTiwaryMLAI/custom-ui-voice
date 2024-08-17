import { Conversation } from '../types/chat';

export interface UseCaseConfigType {
    UseCaseName: string;
    ConversationMemoryType: string;
    KnowledgeBaseType: string;
    KnowledgeBaseParams: {
        NumberOfDocs: number;
        ReturnSourceDocs: boolean;
    };
    LlmParams: {
        ModelProvider: string;
        ModelId: string;
        ModelParams: any;
        PromptTemplate: string;
        Streaming: boolean;
        Verbose: boolean;
        Temperature: number;
        RAGEnabled: boolean;
    };
}

export interface HomeInitialState {
    loading: boolean;
    messageIsStreaming: boolean;
    selectedConversation: Conversation | undefined;
    promptTemplate: string;
    defaultPromptTemplate: string;
    RAGEnabled: boolean;
    useCaseConfig: UseCaseConfigType;
}

export const initialState: HomeInitialState = {
    loading: false,
    messageIsStreaming: false,
    selectedConversation: {
        id: '',
        name: 'New Conversation',
        messages: []
    },
    promptTemplate: '',
    defaultPromptTemplate: '',
    RAGEnabled: false,
    useCaseConfig: {} as UseCaseConfigType
};
