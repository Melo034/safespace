import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Navbar } from "@/components/utils/Navbar"
import { Footer } from "@/components/utils/Footer"
import {toast} from "sonner"
import {
    Heart,
    MessageCircle,
    Share2,
    User,
    Clock,
    ArrowLeft,
    ThumbsUp,
    Eye,
    Shield,
    Send,
    BookOpen,
} from "lucide-react"

// Mock data - in a real app, this would come from an API or database
const mockStories = [
    {
        id: "STY-001",
        slug: "finding-my-voice-journey-to-healing",
        title: "Finding My Voice: A Journey to Healing",
        content:
            "Two years ago, I thought I would never be able to speak about what happened to me. The fear, shame, and trauma felt insurmountable. But with the help of an incredible therapist and the support of this community, I've found my voice again...",
        fullContent:
            "Two years ago, I thought I would never be able to speak about what happened to me. The fear, shame, and trauma felt insurmountable. But with the help of an incredible therapist and the support of this community, I've found my voice again.\n\nToday, I stand as a survivor, not a victim. My journey wasn't easy - there were dark days when getting out of bed felt impossible. But slowly, with professional help and the love of family and friends, I began to heal.\n\nI learned that healing isn't linear, and that's okay. Some days are harder than others, but I've learned to be gentle with myself. The therapy sessions were challenging at first. I remember sitting in that chair, unable to speak for the first few sessions. My therapist was patient, never pushing me beyond what I could handle.\n\nThe breakthrough came when I realized that my silence was giving power to my trauma. Speaking my truth, even in whispers at first, began to take that power back. I started journaling, then sharing with trusted friends, and eventually found the courage to speak publicly.\n\nThis community has been instrumental in my healing. Reading other survivors' stories made me feel less alone. Knowing that others had walked this path and found light at the end of the tunnel gave me hope during my darkest moments.\n\nTo anyone reading this who is still in the midst of their struggle - you are not alone. Your voice matters. Your story matters. And most importantly, you matter. Healing is possible, even when it doesn't feel like it. Take it one day at a time, be patient with yourself, and remember that seeking help is a sign of strength, not weakness.",
        author: {
            name: "Sarah M.",
            anonymous: false,
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=150&h=150&fit=crop&crop=face",
            isVerified: true,
        },
        timestamp: "2024-01-10",
        category: "healing",
        likes: 156,
        comments: 23,
        views: 892,
        tags: ["healing", "therapy", "community"],
        featured: true,
        isLiked: false,
        commentsData: [
            {
                id: 1,
                author: "Michelle K.",
                content: "Thank you for sharing your journey. Your strength inspires me every day.",
                time: "2 hours ago",
            },
            {
                id: 2,
                author: "David L.",
                content: "This really resonated with me. I'm glad you found your voice.",
                time: "1 day ago",
            },
            {
                id: 3,
                author: "Anonymous",
                content: "I'm just starting therapy and this gives me hope. Thank you.",
                time: "3 hours ago",
            },
            {
                id: 4,
                author: "Lisa R.",
                content: "Your words about healing not being linear really hit home. Thank you for the reminder.",
                time: "5 hours ago",
            },
        ],
    },
    {
        id: "STY-002",
        slug: "breaking-the-cycle-how-i-escaped",
        title: "Breaking the Cycle: How I Escaped",
        content:
            "For three years, I lived in fear. Every day was a battle between hope and despair. I want to share my story not for sympathy, but to show others that there is a way out...",
        fullContent:
            "For three years, I lived in fear. Every day was a battle between hope and despair. I want to share my story not for sympathy, but to show others that there is a way out.\n\nThe hardest part wasn't the physical abuse - it was believing I deserved better. The psychological manipulation made me question my own reality. I was told I was worthless, that no one would ever love me, that I was lucky to have someone who 'put up with me.'\n\nBut one day, I met a woman at the grocery store who noticed my bruises and quietly handed me a card for a domestic violence shelter. That small act of kindness changed everything. She didn't ask questions, didn't judge - she just saw someone who needed help and offered it.\n\nIt took me six months to finally call the number. I was scared, ashamed, and convinced that maybe I really was the problem. But when I did call, the voice on the other end was kind and understanding. They helped me create a safety plan, explained my options, and most importantly, believed me.\n\nThe day I left was the scariest and most liberating day of my life. I had packed a small bag and hidden it at work. When he left for his usual Friday night out, I knew it was my chance. My hands were shaking as I grabbed my bag and walked out that door for the last time.\n\nThe shelter became my sanctuary. For the first time in years, I could sleep without fear. The counselors there helped me understand that what I experienced wasn't love - it was control. They helped me rebuild my self-worth and plan for my future.\n\nToday, I have my own apartment, a new job, and most importantly, my freedom. I wake up each morning grateful for the silence - no yelling, no walking on eggshells, no fear. I'm learning to trust my own judgment again and to believe that I deserve kindness and respect.\n\nIf you're reading this and you're scared to leave - please know that help is available. You deserve love, not fear. You deserve peace, not chaos. And you deserve a life where you can be yourself without apology. That woman in the grocery store saved my life with one small act of courage. Maybe this story can be that for someone else.",
        author: {
            name: "Anonymous",
            anonymous: true,
            avatar: null,
            isVerified: false,
        },
        timestamp: "2024-01-08",
        category: "escape",
        likes: 289,
        comments: 41,
        views: 1247,
        tags: ["domestic-violence", "escape", "shelter"],
        featured: true,
        isLiked: true,
        commentsData: [
            {
                id: 1,
                author: "Jennifer R.",
                content: "Your courage in sharing this gives me hope. Thank you.",
                time: "3 hours ago",
            },
            {
                id: 2,
                author: "Anonymous",
                content: "I'm planning my escape now because of stories like yours.",
                time: "1 day ago",
            },
        ],
    },
]

const Story = () => {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const [story, setStory] = useState<any>(null)
    const [newComment, setNewComment] = useState("")
    const [comments, setComments] = useState<any[]>([])

    useEffect(() => {
        // Find story by slug
        const foundStory = mockStories.find((s) => s.slug === params.slug)
        if (foundStory) {
            setStory(foundStory)
            setComments(foundStory.commentsData || [])
            // Increment view count
            foundStory.views += 1
        }
    }, [params.slug])

    const handleLike = () => {
        if (!story) return

        const newIsLiked = !story.isLiked
        setStory({
            ...story,
            isLiked: newIsLiked,
            likes: newIsLiked ? story.likes + 1 : story.likes - 1,
        })

        toast({
            description: newIsLiked ? "Story liked!" : "Like removed",
            duration: 2000,
        })
    }

    const handleShare = async () => {
        if (!story) return

        try {
            const storyUrl = window.location.href
            if (navigator.share) {
                await navigator.share({
                    title: story.title,
                    text: story.content.substring(0, 100) + "...",
                    url: storyUrl,
                })
            } else {
                await navigator.clipboard.writeText(storyUrl)
                toast({
                    description: "Story link copied to clipboard!",
                    duration: 2000,
                })
            }
        } catch (error) {
            console.log("Share failed:", error)
        }
    }

    const handleAddComment = () => {
        if (!newComment.trim() || !story) return

        const newCommentObj = {
            id: comments.length + 1,
            author: "Current User",
            content: newComment,
            time: "Just now",
        }

        setComments([...comments, newCommentObj])
        setStory({
            ...story,
            comments: story.comments + 1,
        })
        setNewComment("")

        toast({
            description: "Comment added successfully!",
            duration: 2000,
        })
    }

    if (!story) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-2xl font-bold text-foreground mb-4">Story not found</h1>
                        <Button onClick={() => router.push("/stories")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Stories
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                {/* Back Button */}
                <div className="max-w-4xl mx-auto mb-6">
                    <Button variant="ghost" onClick={() => router.push("/stories")} className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Stories
                    </Button>
                </div>

                {/* Story Content */}
                <div className="max-w-4xl mx-auto">
                    <Card className="mb-8">
                        <CardHeader>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    {story.author.avatar ? (
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={story.author.avatar || "/placeholder.svg"} alt={story.author.name} />
                                            <AvatarFallback>
                                                <User className="h-6 w-6" />
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                            {story.author.anonymous ? <Shield className="h-6 w-6" /> : <User className="h-6 w-6" />}
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <p className="font-semibold">{story.author.name}</p>
                                            {story.author.isVerified && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Verified
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            <span>{new Date(story.timestamp).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Badge variant="outline">{story.category.replace("-", " ")}</Badge>
                                    {story.featured && <Badge variant="secondary">Featured</Badge>}
                                </div>
                            </div>

                            <CardTitle className="text-3xl mb-4">{story.title}</CardTitle>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {story.tags.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        #{tag.replace("-", "")}
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                    <Heart className={`h-4 w-4 ${story.isLiked ? "fill-red-500 text-red-500" : ""}`} />
                                    <span>{story.likes}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <MessageCircle className="h-4 w-4" />
                                    <span>{story.comments}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Eye className="h-4 w-4" />
                                    <span>{story.views}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <BookOpen className="h-4 w-4" />
                                    <span>{Math.ceil(story.fullContent.length / 1000)} min read</span>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="prose prose-lg max-w-none mb-8">
                                {story.fullContent.split("\n\n").map((paragraph: string, index: number) => (
                                    <p key={index} className="mb-4 leading-relaxed text-foreground">
                                        {paragraph}
                                    </p>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t">
                                <div className="flex space-x-2">
                                    <Button variant="outline" onClick={handleLike} className="flex items-center space-x-2 bg-transparent">
                                        <ThumbsUp className={`h-4 w-4 ${story.isLiked ? "fill-blue-500 text-blue-500" : ""}`} />
                                        <span>{story.isLiked ? "Liked" : "Like"}</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleShare}
                                        className="flex items-center space-x-2 bg-transparent"
                                    >
                                        <Share2 className="h-4 w-4" />
                                        <span>Share</span>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Comments Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <MessageCircle className="h-5 w-5" />
                                <span>Comments ({comments.length})</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Add Comment */}
                            <div className="flex space-x-3 mb-6">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="flex-1 flex space-x-2">
                                    <Input
                                        placeholder="Add a thoughtful comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Comments List */}
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex space-x-3">
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="font-medium text-sm">{comment.author}</span>
                                                <span className="text-xs text-muted-foreground">{comment.time}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
                                        </div>
                                    </div>
                                ))}

                                {comments.length === 0 && (
                                    <div className="text-center py-8">
                                        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-foreground mb-2">No comments yet</h3>
                                        <p className="text-muted-foreground">Be the first to share your thoughts on this story.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Community Guidelines Reminder */}
                    <Card className="mt-8 border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2 text-primary">
                                <Shield className="h-5 w-5" />
                                <span>Community Guidelines</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Please keep comments respectful and supportive. This is a safe space for survivors to share their
                                experiences. Victim blaming, judgment, or harmful content will not be tolerated.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />

            export default Story