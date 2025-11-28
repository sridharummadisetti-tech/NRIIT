import React from 'react';
import { ChatMessage, ChatAuthor } from '../types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isLoading?: boolean;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, isLoading }) => {
  const isUser = message.author === ChatAuthor.USER;
  const isAI = message.author === ChatAuthor.AI;

  const bubbleClasses = {
    base: 'max-w-xs md:max-w-md p-3 rounded-lg break-words',
    user: 'bg-blue-500 text-white self-end rounded-br-none',
    ai: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 self-start rounded-bl-none',
    system: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm italic text-center w-full max-w-none',
  };

  const getBubbleStyle = () => {
    switch (message.author) {
      case ChatAuthor.USER: return bubbleClasses.user;
      case ChatAuthor.AI: return bubbleClasses.ai;
      case ChatAuthor.SYSTEM: return bubbleClasses.system;
      default: return '';
    }
  };

  const LoadingIndicator = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
    </div>
  );
  
  const AuthorIcon: React.FC<{ author: ChatAuthor }> = ({ author }) => {
    const iconBase = 'w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0';
    if (author === ChatAuthor.AI) {
      return (
        <div className={`${iconBase} bg-purple-500`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h.5a1.5 1.5 0 010 3H14a1 1 0 00-1 1v1.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H9a1 1 0 001-1v-.5z" /><path d="M10 12a4 4 0 100 8 4 4 0 000-8zM7 16a3 3 0 116 0 3 3 0 01-6 0z" /></svg>
        </div>
      );
    }
    if (author === ChatAuthor.USER) {
      return (
        <div className={`${iconBase} bg-blue-500`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
        </div>
      );
    }
    return null;
  };


  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} items-start gap-3 anim-chat-bubble`}>
      {!isUser && <AuthorIcon author={message.author} />}
      <div className={`${bubbleClasses.base} ${getBubbleStyle()}`}>
        {isLoading ? <LoadingIndicator /> : message.text}
      </div>
       {isUser && <AuthorIcon author={message.author} />}
    </div>
  );
};

export default ChatMessageBubble;