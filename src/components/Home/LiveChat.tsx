import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send } from "lucide-react";

const LiveChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hello! I'm here to help. This is a safe, confidential space. How can I support you today?",
            sender: "support",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputMessage, setInputMessage] = useState("");

    const sendMessage = () => {
        if (!inputMessage.trim()) return;

        const newMessage = {
            id: messages.length + 1,
            text: inputMessage,
            sender: "user",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages([...messages, newMessage]);
        setInputMessage("");

        // Simulate support response
        setTimeout(() => {
            const supportResponse = {
                id: messages.length + 2,
                text: "Thank you for reaching out. I understand this may be difficult. Can you tell me more about what's happening?",
                sender: "support",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, supportResponse]);
        }, 1500);
    };

    return (
        <>
            {/* Chat Button */}
            <Button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-4 sm:bottom-8 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg transition-all duration-300 ${isOpen ? "scale-0" : "scale-100"
                    }`}
            >
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            {/* Chat Window */}
            {isOpen && (
                <Card className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 w-[90vw] max-w-sm h-[80vh] max-h-[30rem] shadow-2xl border-0 animate-scale-in z-50">
                    <CardHeader className="bg-primary text-white rounded-t-lg">
                        <div className="flex items-center justify-between py-2">
                            <CardTitle className="text-lg">Live Support</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                                className="text-white"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="text-sm py-2 opacity-90">Confidential • Available 24/7</div>
                    </CardHeader>

                    <CardContent className="p-0 flex flex-col h-[calc(100%-4rem)]">
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${message.sender === "user"
                                                ? "bg-primary text-white"
                                                : "bg-gray-100 text-gray-800"
                                            }`}
                                    >
                                        <div>{message.text}</div>
                                        <div
                                            className={`text-xs mt-1 ${message.sender === "user"
                                                    ? "text-blue-100"
                                                    : "text-gray-500"
                                                }`}
                                        >
                                            {message.time}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-gray-200">
                            <div className="flex space-x-2">
                                <Input
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={sendMessage}
                                    size="sm"
                                    className="bg-primary text-white hover:bg-primary/90"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    )
}

export default LiveChat