import React, { useState, useRef, useEffect } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { supabase } from '../../supabase/client';
import { Sparkles, X, Send, Loader2, Bot } from 'lucide-react';

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

const AIChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { transactions, categories, accounts } = useAppData();
    const chatBodyRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        // Scroll to bottom when new messages are added
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);
    
    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen && messages.length === 0) {
            // Add initial greeting message
            setMessages([{ sender: 'ai', text: 'Olá! Sou seu assistente financeiro. Como posso ajudar a analisar suas contas hoje?' }]);
        }
    };

    const handleSend = async () => {
        if (!userInput.trim() || isLoading) return;

        const newMessages: Message[] = [...messages, { sender: 'user', text: userInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        try {
            // Prepare a simplified context for the AI
            const contextData = {
                accounts: accounts.map(({ id, name, type }) => ({ id, name, type })),
                categories: categories.map(({ id, name, type }) => ({ id, name, type })),
                recent_transactions: transactions.slice(0, 50).map(({ description, nature, categoryId, date, value }) => ({
                    description,
                    nature,
                    category: categories.find(c => c.id === categoryId)?.name || 'Desconhecida',
                    date,
                    value
                }))
            };

            const { data, error } = await supabase.functions.invoke('ai-chat', {
                body: { query: userInput, contextData },
            });

            if (error) throw new Error(`Function error: ${error.message}`);
            
            setMessages([...newMessages, { sender: 'ai', text: data.reply }]);

        } catch (error) {
            console.error("Error calling AI chat function:", error);
            const errorMessage = error instanceof Error ? error.message : "Desculpe, não consegui processar sua solicitação.";
            setMessages([...newMessages, { sender: 'ai', text: `Ocorreu um erro: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-40"
                aria-label="Abrir assistente de IA"
            >
                <Sparkles size={24} />
            </button>

            {/* Chat Window */}
            {isOpen && (
                 <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-scale-in">
                    {/* Header */}
                    <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <Bot className="w-6 h-6 text-blue-600" />
                            <h3 className="font-semibold text-gray-800">Assistente Financeiro</h3>
                        </div>
                        <button onClick={toggleChat} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div ref={chatBodyRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-5 h-5 text-gray-500" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] p-3 rounded-2xl ${
                                    msg.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-lg'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-lg'
                                }`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-gray-500" />
                                </div>
                                <div className="max-w-[80%] p-3 rounded-2xl bg-gray-100 text-gray-800 rounded-bl-lg">
                                    <div className="flex items-center gap-2">
                                       <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                       <p className="text-sm text-gray-500">Pensando...</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Input */}
                    <div className="flex-shrink-0 p-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Pergunte algo..."
                                className="w-full px-4 py-2 bg-gray-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!userInput.trim() || isLoading}
                                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                 </div>
            )}
        </>
    );
};

export default AIChat;