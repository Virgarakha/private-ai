import React, { useState, useCallback, useEffect } from "react";
import Groq from "groq-sdk";
import { motion } from "framer-motion";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import '../App.css';

const parseCodeBlocks = (content) => {
  const parts = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }

    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  return parts;
};

const languageStyles = {
  php: {
    bg: 'bg-purple-600',
    text: 'text-white'
  },
  javascript: {
    bg: 'bg-yellow-600',
    text: 'text-white'
  },
  python: {
    bg: 'bg-blue-600',
    text: 'text-white'
  },
  java: {
    bg: 'bg-red-600',
    text: 'text-white'
  },
  typescript: {
    bg: 'bg-blue-500',
    text: 'text-white'
  },
  css: {
    bg: 'bg-pink-500',
    text: 'text-white'
  },
  html: {
    bg: 'bg-orange-500',
    text: 'text-white'
  }
};

const getLanguageStyle = (language) => {
  return languageStyles[language.toLowerCase()] || { bg: 'bg-gray-800', text: 'text-gray-200' };
};

// Groq AI configuration
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const requestToGroqAi = async (messages) => {
  try {
    const completion = await groq.chat.completions.create({
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1,
      stop: null,
      stream: false
    });

    return completion.choices[0]?.message?.content || "Maaf, saya tidak dapat memproses permintaan Anda saat ini.";
  } catch (error) {
    console.error('Error calling Groq AI:', error);
    throw new Error('Failed to get response from AI');
  }
};

const CopyButton = ({ code }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className="absolute top-2 right-2 p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
    >
      {isCopied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-gray-300" />
      )}
    </button>
  );
};

const CodingAIChatbot = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('chatMessages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
        } else {
          setInitialMessage();
        }
      } else {
        setInitialMessage();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setInitialMessage();
    }
  }, []);

  const setInitialMessage = () => {
    const initialMessage = [{ 
      role: "assistant", 
      content: "Halo! Saya asisten coding Anda. Apa yang bisa saya bantu hari ini? 💻✨" 
    }];
    setMessages(initialMessage);
    localStorage.setItem('chatMessages', JSON.stringify(initialMessage));
  };

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('chatMessages', JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    }
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", content: message }
    ];

    setMessages(newMessages);
    localStorage.setItem('chatMessages', JSON.stringify(newMessages));
    setMessage("");
    setLoading(true);

    try {
      const reply = await requestToGroqAi(newMessages);
      const updatedMessages = [
        ...newMessages,
        { role: "assistant", content: reply }
      ];
      setMessages(updatedMessages);
      localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
    } catch (error) {
      const errorMessages = [
        ...newMessages,
        { role: "assistant", content: "Maaf, terjadi kesalahan. Silakan coba lagi. 🛠️" }
      ];
      setMessages(errorMessages);
      localStorage.setItem('chatMessages', JSON.stringify(errorMessages));
    } finally {
      setLoading(false);
    }
  }, [message, messages]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && message.trim() && !loading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    const initialMessage = { 
      role: "assistant", 
      content: "Chat direset! Siap membantu Anda dengan pertanyaan coding berikutnya! 🖥️" 
    };
    setMessages([initialMessage]);
    localStorage.setItem('chatMessages', JSON.stringify([initialMessage]));
  };

  const renderMessage = (msg) => {
    if (msg.role === 'user') {
      return (
        <div className="flex justify-end mb-4">
          <div className="chthtm text-white rounded-lg py-2 px-4 max-w-[80%] ">
            {msg.content}
          </div>
        </div>
      );
    }

    const parsedContent = parseCodeBlocks(msg.content);

    return (
      <div className="flex mb-4">
        <div className="bg-gray-100 chthtm text-white rounded-lg py-2 px-4 max-w-[80%] ">
          {parsedContent.map((part, index) => 
            part.type === 'code' ? (
              <div key={index} className="my-2 rounded-lg text-white overflow-hidden relative">
                <div className={`${getLanguageStyle(part.language).bg} ${getLanguageStyle(part.language).text} px-4 py-2 text-white text-xs rounded-t-lg font-medium flex items-center`}>
                  {part.language.toUpperCase()}
                </div>
                <div className="relative">
                  <CopyButton code={part.content} />
                  <SyntaxHighlighter 
                    language={part.language} 
                    style={dracula}
                    className="rounded-b-lg"
                    customStyle={{
                      margin: 0,
                      fontSize: '0.9rem',
                    }}
                  >
                    {part.content}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <div key={index} className="my-2 text-white whitespace-pre-wrap">{part.content}</div>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:w-[70%] h-[100vh] rounded-t-xl">
      <div className=" text-white p-4 rounded-t-xl flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2">
          <span className="text-xl">🤖</span>
          Private Ai
        </h3>
        <motion.button 
          onClick={clearConversation}
          whileHover={{ scale: 1.1 }}
          className="text-white text-sm flex items-center gap-1"
        >
          <span>🗑️</span>
          Reset
        </motion.button>
      </div>

      <div className="flex flex-col h-[90vh] md:h-[93vh]">
        <div className="flex-1 bghf overflow-y-auto overflow-hidden px-4 py-6 bg-gray-50">
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {renderMessage(msg)}
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-2 justify-center items-center text-gray-500">
              <div className="animate-bounce">⌛</div>
              Sedang mengetik...
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ketik pertanyaan..."
              disabled={loading}
              rows={1}
              className="flex-1 p-3 bghitam  text-sm md:text-md text-white rounded-lg focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 resize-none"
              style={{
                minHeight: '44px',
                maxHeight: '120px'
              }}
            />
            <motion.button 
              onClick={handleSendMessage} 
              disabled={loading || !message.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-md flex items-center gap-2"
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>Kirim</span>
                  <span>➤</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingAIChatbot;