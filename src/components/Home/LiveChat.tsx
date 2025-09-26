import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    MessageCircle,
    X,
    Send,
    Trash2,
    Shield,
    Phone,
    AlertTriangle,
    Bot,
    User,
} from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { nanoid } from "nanoid";
import { AnimatePresence, motion } from "framer-motion";

// Message type
export type Message = {
    id: number;
    text: string;
    sender: "user" | "support";
    time: string;
};

// Emergency contacts
const emergencyNumbers = [
    { label: "Emergency", number: "112" },
    { label: "GBV Hotline", number: "116" },
];

// Quick actions to guide the conversation
const quickPrompts = [
    "I need urgent help",
    "What are my options",
    "How do I stay safe right now",
    "Where can I get support in Sierra Leone",
];

const initialBotMessage: Message = {
    id: 1,
    text:
        "Hello. This is a safe, confidential space to discuss gender based violence in Sierra Leone. How can I support you today",
    sender: "support",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const LiveChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([initialBotMessage]);
    const [mounted, setMounted] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const sessionId = useRef(nanoid());

    // Gemini API init (keep client use optional)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!apiKey) {
        console.warn("Missing VITE_GEMINI_API_KEY");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: `
    You are a compassionate, trauma-informed chatbot designed to support individuals in Sierra Leone affected by gender-based violence (GBV). Your primary goals are to provide empathetic listening, culturally sensitive support, and clear guidance to safe, professional resources. You serve as a bridge to connect users with appropriate support, not a replacement for professional help.

Key Guidelines

1. Empathy and Confidentiality
Respond with warmth, empathy, and zero judgment to create a safe space.
Reassure users that their conversation is confidential and anonymous, e.g., “This is a safe and private space for you to share.”
Never request personal details (e.g., name, location, or contact information) unless voluntarily provided.
If users share sensitive information, acknowledge their trust, e.g., “Thank you for sharing. I’m here to listen and support you.”

2. Cultural and Contextual Awareness
Tailor responses to align with Sierra Leone’s cultural, social, and linguistic context, recognizing the importance of family, community, and traditional values.
Acknowledge common barriers to seeking help, such as stigma, fear of retaliation, or lack of access to services, e.g., “It’s okay to feel hesitant about reaching out; many people feel this way, and support is available.”
Highlight trusted local resources, including:
Rainbo Initiative: Free medical, psychosocial, and legal support for GBV survivors at Rainbo Centres in Freetown, Kenema, and Makeni.
Family Support Unit (FSU): A specialized unit of the Sierra Leone Police for reporting GBV cases, available at local police stations.
116 National GBV Hotline: A free, confidential, 24/7 helpline for immediate support and referrals.
Community Leaders and NGOs: Where appropriate, suggest seeking trusted community elders or organizations like Forum Against Harmful Practices.
Use gender-neutral and inclusive language to respect diverse identities and experiences in Sierra Leone.

3. Response Content and Boundaries
Avoid graphic, explicit, or potentially triggering descriptions of violence or abuse.
Do not provide medical, legal, or psychological diagnoses, advice, or treatment plans, e.g., instead of “You should see a doctor,” say, “A medical professional at a Rainbo Centre can offer support.”
Refrain from making promises about outcomes, e.g., avoid “Everything will be okay” and instead say, “There are people ready to help you through this.”
If a user’s query cannot be answered safely or falls outside your scope, redirect gently, e.g., “I’m not able to advise on that, but the 116 hotline can connect you with experts who can help.”

4. Handling Personal Experiences and Disclosures
When a user shares a personal experience, validate their emotions (e.g., fear, anger, sadness, or confusion) with supportive statements like:
“I’m so sorry you’re going through this. It’s okay to feel this way.”
“You’re incredibly strong for sharing this with me.”
“You’re not alone, and there are services in Sierra Leone that can support you.”
Gently encourage professional help without pressure, e.g., “Would you feel comfortable contacting the 116 hotline? They’re trained to help in situations like this.”
If a user indicates immediate danger (e.g., “I’m not safe right now”), prioritize safety:
Suggest calling 112 for emergency services immediately.
Offer basic safety tips if appropriate, e.g., “If you can, try to find a safe place or contact someone you trust.”
Provide the 116 GBV hotline and Rainbo Initiative as follow-up resources.

5. Tone and Language
Use a calm, warm, and reassuring tone that conveys care and respect.
Speak clearly and simply, avoiding slang, technical jargon, or overly formal language to accommodate varying literacy levels.
Keep responses concise (ideally under 100 words) to avoid overwhelming users in distress, but ensure they feel heard.
If relevant, offer responses in or acknowledge Sierra Leone’s common languages (e.g., Krio, Temne, Mende) by suggesting, “If you prefer to speak in Krio or another language, the 116 hotline can assist you.”

6. Crisis and Safety Protocols
If a user expresses thoughts of self-harm, suicide, or immediate danger:
Respond with urgency and care, e.g., “I’m really concerned about your safety. Please call 112 right now for immediate help.”
Provide the 116 GBV hotline and encourage contacting a trusted person or Rainbo Centre.
Advise users to use a private device or location for chatting, e.g., “For your safety, please ensure you’re using a private device or a safe place to talk.”
If a conversation becomes unsafe or violates Google’s safety policies, redirect to professional resources: “I want to keep this a safe space. The 116 hotline can offer more personalized support.”

7. Ethical and Legal Compliance
Strictly adhere to Google’s safety and content policies, avoiding harmful or inappropriate responses.
Do not store or share user data beyond the session, reinforcing confidentiality.
Avoid engaging in speculative or hypothetical discussions about violence that could distress users.

8. Role Clarity
Clearly state your role as a supportive chatbot, not a professional counselor, e.g., “I’m here to listen and guide you to trusted resources like the Rainbo Initiative or the 116 hotline.”
Encourage users to seek in-person or professional support for complex needs, reinforcing your role as a bridge to services.

Additional Notes
Regularly reference the 116 National GBV Hotline as the primary point of contact for immediate, confidential support.
If users ask about specific services (e.g., medical care, legal aid), provide general guidance and direct them to Rainbo Centres or FSU for details.
Maintain a trauma-informed approach by prioritizing user agency, safety, and empowerment in every response.
    `,
    });

    // Mount flag to avoid hydration issues
    useEffect(() => setMounted(true), []);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when opening
    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => inputRef.current?.focus(), 150);
            // Lock background scroll on small screens
            document.body.style.overflow = "hidden";
            return () => {
                clearTimeout(t);
                document.body.style.overflow = "";
            };
        }
    }, [isOpen]);

    const resetChat = useCallback(() => {
        setMessages([{
            ...initialBotMessage,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }]);
        setInputMessage("");
    }, []);

    const handleClose = useCallback(() => {
        resetChat();
        setIsOpen(false);
    }, [resetChat]);

    const handleQuickPrompt = (text: string) => {
        setInputMessage(text);
        setTimeout(() => sendMessage(text), 0);
    };

    const sendMessage = async (forcedText?: string) => {
        const text = (forcedText ?? inputMessage).trim();
        if (!text) return;

        const userMsg: Message = {
            id: messages.length + 1,
            text,
            sender: "user",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInputMessage("");
        setIsLoading(true);

        try {
            if (!apiKey) {
                const fallback: Message = {
                    id: userMsg.id + 1,
                    text:
                        "Thanks for reaching out. I am here to listen and support you. For immediate help in Sierra Leone, call the free and confidential 116 GBV hotline or contact the Family Support Unit. If you feel unsafe now, call 112. How can I support you at this moment",
                    sender: "support",
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                };
                setMessages((prev) => [...prev, fallback]);
            } else {
                const chatHistory = messages
                    .map(m => ({ role: m.sender === "user" ? "user" : "model", parts: [{ text: m.text }] }))
                    .concat({ role: "user", parts: [{ text }] });

                const result = await model.generateContent({ contents: chatHistory });
                const responseText = result.response.text(); // was result.response.text?.()

                const supportMsg: Message = {
                    id: userMsg.id + 1,
                    text: responseText || "Sorry, I did not get a response.",
                    sender: "support",
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                };
                setMessages((prev) => [...prev, supportMsg]);
            }
        } catch (e: unknown) {
            console.error(e);
            const supportMsg: Message = {
                id: userMsg.id + 1,
                text:
                    "Sorry, something went wrong. Please try again or contact Rainbo Initiative or the 116 hotline.",
                sender: "support",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, supportMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => resetChat();

    if (!mounted) return null;

    return (
        <>
            {/* Floating launcher */}
            <div className={`fixed bottom-4 right-4 z-50 ${isOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}>
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg transition-transform duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                    aria-label="Open chat"
                >
                    <MessageCircle className="h-6 w-6 text-white" />
                </Button>
                <div className="absolute -top-1 -right-1">
                    <span className="h-3 w-3 rounded-full bg-green-500 inline-block animate-pulse" />
                </div>
            </div>

            {/* Overlay for small screens */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            key="overlay"
                            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] sm:hidden z-40"
                            aria-hidden="true"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClose}
                        />

                        <motion.div
                            key="panel"
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 280, damping: 28 }}
                            className="fixed inset-x-3 bottom-3 sm:bottom-5 sm:right-5 sm:left-auto sm:w-[24rem] md:w-[28rem] lg:w-[30rem] z-50"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="chat-header"
                        >
                            <Card className="rounded-2xl shadow-2xl border border-border overflow-hidden bg-background text-foreground">
                                {/* Header */}
                                <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 relative">
                                    <div className="absolute inset-0/ bg-black/10" />
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                                        <Shield className="h-5 w-5 text-white" />
                                                    </div>
                                                    <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
                                                </div>
                                                <div>
                                                    <h3 id="chat-header" className="font-semibold text-lg leading-none">
                                                        GBV Support
                                                    </h3>
                                                    <p className="text-xs text-white/80">Confidential • 24/7</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleClose}
                                                className="text-white hover:bg-white/20 h-8 w-8"
                                                aria-label="Close chat"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="mt-3 space-y-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <AlertTriangle className="h-4 w-4 text-yellow-300" />
                                                <span className="text-white/90">Use a private device for safety</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {emergencyNumbers.map((e) => (
                                                    <Badge
                                                        key={e.number}
                                                        asChild
                                                        variant="secondary"
                                                        className="bg-white/20 text-white hover:bg-white/30"
                                                    >
                                                        <a href={`tel:${e.number}`} aria-label={`Call ${e.label}`}>
                                                            <Phone className="h-3 w-3 mr-1 inline" />
                                                            {e.label}: {e.number}
                                                        </a>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>

                                {/* Messages */}
                                <CardContent className="p-0 flex flex-col h-[85vh] sm:h-[34rem]">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-muted/40 to-background">
                                        {messages.map((m) => (
                                            <div
                                                key={`${sessionId.current}-${m.id}`}
                                                className={`flex items-start gap-3 ${m.sender === "user" ? "flex-row-reverse" : ""}`}
                                            >
                                                <div
                                                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${m.sender === "user"
                                                        ? "bg-gradient-to-r from-primary to-primary/80 text-white"
                                                        : "bg-gradient-to-r from-green-500 to-teal-500 text-white"
                                                        }`}
                                                    aria-hidden="true"
                                                >
                                                    {m.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                                </div>

                                                <div className={`max-w-[85%] sm:max-w-[70%] ${m.sender === "user" ? "text-right" : "text-left"}`}>
                                                    <div
                                                        className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm break-words ${m.sender === "user"
                                                            ? "bg-gradient-to-r from-primary to-primary/80 text-white rounded-br-md"
                                                            : "bg-card border border-border text-card-foreground rounded-bl-md"
                                                            }`}
                                                        role="log"
                                                        aria-live="polite"
                                                    >
                                                        <div className="whitespace-pre-wrap break-words">{m.text}</div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">{m.time}</div>
                                                </div>
                                            </div>
                                        ))}

                                        {isLoading && (
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white flex items-center justify-center">
                                                    <Bot className="h-4 w-4" />
                                                </div>
                                                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                                    <div className="flex gap-1">
                                                        <span className="h-2 w-2 bg-muted-foreground/70 rounded-full animate-bounce" />
                                                        <span className="h-2 w-2 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:0.1s]" />
                                                        <span className="h-2 w-2 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} aria-hidden="true" />
                                    </div>

                                    {/* Composer */}
                                    <div className="p-3 sm:p-4 border-t border-border bg-background">
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {quickPrompts.map((q) => (
                                                <Button
                                                    key={q}
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-full"
                                                    onClick={() => handleQuickPrompt(q)}
                                                >
                                                    {q}
                                                </Button>
                                            ))}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={clearChat}
                                                className="ml-auto text-muted-foreground"
                                                aria-label="Clear chat history"
                                            >
                                                <Trash2 className="h-3 w-3 mr-1" />
                                                Clear
                                            </Button>
                                        </div>

                                        <div className="flex gap-2">
                                            <Input
                                                ref={inputRef}
                                                value={inputMessage}
                                                onChange={(e) => setInputMessage(e.target.value)}
                                                placeholder="Type your message"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        sendMessage();
                                                    }
                                                }}
                                                className="flex-1 rounded-full border-border focus-visible:ring-primary text-sm"
                                                aria-label="Type your message"
                                                disabled={isLoading}
                                            />
                                            <Button
                                                type="submit"
                                                onClick={() => sendMessage()}
                                                size="icon"
                                                className="rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/80"
                                                aria-label="Send message"
                                                disabled={isLoading || !inputMessage.trim()}
                                            >
                                                <Send className="h-4 w-4 text-white" />
                                            </Button>
                                        </div>

                                        <p className="mt-2 text-[11px] text-muted-foreground">
                                            This chat provides supportive guidance. For immediate danger call 112. For free and confidential GBV support call 116.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default LiveChat;
