import { Conversation } from '../types/chat';

export const saveConversation = (conversation: Conversation) => {
    localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};
