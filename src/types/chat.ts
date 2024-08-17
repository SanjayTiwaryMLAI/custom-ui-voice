export interface Message {
    role: Role;
    content: string;
}

export interface SourceDocument {
    result_id: string;
    document_id: string;
    source: string;
    title: string;
    excerpt: string;
    document_attributes: any;
}

export interface MessageWithSource extends Message {
    sourceDocuments?: SourceDocument[];
}

export type Role = 'assistant' | 'user';

export interface Conversation {
    id: string;
    name: string;
    messages: MessageWithSource[];
}

export interface FeedbackData {
}
