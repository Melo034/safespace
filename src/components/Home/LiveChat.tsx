import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Trash2, Shield, Phone, AlertTriangle, Bot, User } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { nanoid } from "nanoid";

// Define message type
type Message = {
    id: number;
    text: string;
    sender: "user" | "support";
    time: string;
};

// Emergency contact information
const emergencyNumbers = [
    { label: "Emergency", number: "112" },
    { label: "GBV Hotline", number: "116" },
];

const LiveChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionId = useRef(nanoid()); // Unique session ID for each user session

    // Initialize chat history with a default message
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Hello! This is a safe, confidential space to discuss gender-based violence in Sierra Leone. How can I support you today?",
            sender: "support",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
    ]);

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `
      You are a compassionate, trauma-informed chatbot designed to support individuals in Sierra Leone affected by gender-based violence (GBV). Your primary goals are to provide empathetic listening, culturally appropriate support, and guidance to safe, professional resources.
      Key Guidelines:

1. **Empathy and Confidentiality**  
   - Always respond with empathy, warmth, and without judgment.  
   - Reassure users that they are not alone, and their privacy is respected at all times.  
   - Do not ask for personal details unless the user offers them voluntarily.

2. **Cultural and Contextual Awareness**  
   - Tailor your responses to reflect the cultural context of Sierra Leone.  
   - Mention relevant and trusted local resources such as:  
     - **Rainbo Initiative**  
     - **Family Support Unit (FSU)** of the Sierra Leone Police  
     - **116 National GBV Hotline** (free and confidential)  

3. **Response Content and Boundaries**  
   - Avoid any graphic, explicit, or triggering descriptions of violence.  
   - Never offer medical, legal, or psychological diagnoses.  
   - Do not make promises or guarantees regarding safety or outcomes.

4. **When a User Shares a Personal Experience**  
   - Acknowledge and validate the user's emotions (e.g., fear, anger, confusion).  
   - Use supportive statements like:  
     - “I'm so sorry you're going through this.”  
     - “You are strong for reaching out.”  
     - “There are people and organizations that want to help you.”  
   - Gently encourage the user to seek help from trained professionals or support services.

5. **Tone and Language**  
   - Maintain a calm, respectful, and caring tone at all times.  
   - Avoid slang, technical jargon, or overly formal language. Speak in a clear, accessible way.  
   - Be brief but reassuring. Long messages may overwhelm someone in distress.

Important: Adhere to Google's safety and content policies at all times. If a question or message cannot be answered safely or appropriately, gently redirect the user toward a professional resource or advise them to contact the 116 hotline.

You are not a replacement for professional help but a bridge to connect users with the right support.
    `,
    });

    // Scroll to the bottom of the chat when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Reset chat when closing
    const handleCloseChat = () => {
        setMessages([
            {
                id: 1,
                text: "Hello! This is a safe, confidential space to discuss gender-based violence in Sierra Leone. How can I support you today?",
                sender: "support",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
        ]);
        setInputMessage("");
        setIsOpen(false);
        setIsMinimized(false);
    };

    // Handle sending a message
    const sendMessage = async () => {
        if (!inputMessage.trim()) return;

        const newMessage: Message = {
            id: messages.length + 1,
            text: inputMessage,
            sender: "user",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputMessage("");
        setIsLoading(true);

        try {
            const chatHistory = messages
                .map((msg) => ({
                    role: msg.sender === "user" ? "user" : "model",
                    parts: [{ text: msg.text }],
                }))
                .concat({ role: "user", parts: [{ text: inputMessage }] });

            const result = await model.generateContent({ contents: chatHistory });
            const responseText = await result.response.text();

            const supportResponse: Message = {
                id: messages.length + 2,
                text: responseText,
                sender: "support",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };

            setMessages((prev) => [...prev, supportResponse]);
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            const errorResponse: Message = {
                id: messages.length + 2,
                text: "I'm sorry, something went wrong. Please try again or contact a local support service like the Rainbo Initiative or the 116 hotline.",
                sender: "support",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, errorResponse]);
        } finally {
            setIsLoading(false);
        }
    };

    // Clear chat history
    const clearChatHistory = () => {
        const initialMessage: Message[] = [
            {
                id: 1,
                text: "Hello! This is a safe, confidential space to discuss gender-based violence in Sierra Leone. How can I support you today?",
                sender: "support",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
        ];
        setMessages(initialMessage);
    };

    return (
        <>
            {/* Chat Toggle Button */}
            <div
                className={`fixed bottom-4 right-4 z-50 transition-transform duration-300 ${isOpen ? "scale-0" : "scale-100"
                    }`}
            >
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Open chat"
                >
                    <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </Button>
                <div className="absolute -top-1 -right-1">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                </div>
            </div>

            {/* Chat Window */}
            {isOpen && (
                <Card
                    className={`fixed bottom-4 right-4 w-full py-10 max-w-md sm:max-w-lg md:max-w-xl shadow-2xl border-0 rounded-2xl overflow-hidden z-50 transition-all duration-300 ${isMinimized ? "h-14" : "h-[75vh] max-h-[600px]"
                        } md:w-96`}
                    role="dialog"
                    aria-labelledby="chat-header"
                >
                    {/* Header */}
                    <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 relative overflow-visible min-h-[160px]">
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white" />
                                    </div>
                                    <div>
                                        <h3 id="chat-header" className="font-semibold text-lg">
                                            GBV Support
                                        </h3>
                                        <p className="text-sm text-white/80">Confidential • 24/7</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCloseChat}
                                        className="text-white hover:bg-white/20 h-8 w-8 p-0"
                                        aria-label="Close chat"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {!isMinimized && (
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center space-x-2 text-sm">
                                        <AlertTriangle className="h-4 w-4 text-yellow-300" />
                                        <span className="text-white/90">Use a private device for safety</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {emergencyNumbers.map((emergency) => (
                                            <Badge
                                                key={emergency.number}
                                                variant="secondary"
                                                className="bg-white/20 text-white hover:bg-white/30"
                                            >
                                                <Phone className="h-3 w-3 mr-1" />
                                                {emergency.label}: {emergency.number}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    {/* Chat Body */}
                    {!isMinimized && (
                        <CardContent className="p-0 flex flex-col h-[calc(100%-140px)]">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                                {messages.map((message) => (
                                    <div
                                        key={`${sessionId.current}-${message.id}`}
                                        className={`flex items-start space-x-3 ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                                            }`}
                                    >
                                        <div
                                            className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${message.sender === "user"
                                                ? "bg-gradient-to-r from-primary to-primary/80 text-white"
                                                : "bg-gradient-to-r from-green-500 to-teal-500 text-white"
                                                }`}
                                            aria-hidden="true"
                                        >
                                            {message.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        </div>
                                        <div className={`max-w-[75%] ${message.sender === "user" ? "text-right" : "text-left"}`}>
                                            <div
                                                className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${message.sender === "user"
                                                    ? "bg-gradient-to-r from-primary to-primary/80 text-white rounded-br-md"
                                                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                                                    }`}
                                                role="log"
                                                aria-live="polite"
                                            >
                                                <div className="whitespace-pre-wrap">{message.text}</div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{message.time}</div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white flex items-center justify-center">
                                            <Bot className="h-4 w-4" />
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                            <div className="flex space-x-1">
                                                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                                                <div
                                                    className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                                                    style={{ animationDelay: "0.1s" }}
                                                />
                                                <div
                                                    className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                                                    style={{ animationDelay: "0.2s" }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} aria-hidden="true" />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-gray-200">
                                <div className="flex items-center space-x-2 mb-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearChatHistory}
                                        className="text-gray-600 hover:text-gray-800 bg-transparent"
                                        aria-label="Clear chat history"
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Clear
                                    </Button>
                                </div>
                                <div className="flex space-x-2">
                                    <Input
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                        className="flex-1 rounded-full border-gray-300 focus:border-primary focus:ring-primary"
                                        disabled={isLoading}
                                        aria-label="Type your message"
                                    />
                                    <Button
                                        type="submit"
                                        onClick={sendMessage}
                                        size="icon"
                                        className="rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/80 transition-all duration-200"
                                        disabled={isLoading || !inputMessage.trim()}
                                        aria-label="Send message"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}
        </>
    );
};

export default LiveChat;