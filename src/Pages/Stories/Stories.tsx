import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Navbar } from "@/components/utils/Navbar"
import { Footer } from "@/components/utils/Footer"
import {
    Heart, MessageCircle, Share2, User, Clock, Filter,
    Plus, Award, ThumbsUp, Eye, Shield
} from "lucide-react"

// Mock data for stories
const mockStories = [
    {
        id: "STY-001",
        title: "Finding My Voice: A Journey to Healing",
        content: "Two years ago, I thought I would never be able to speak about what happened to me. The fear, shame, and trauma felt insurmountable. But with the help of an incredible therapist and the support of this community, I've found my voice again...",
        fullContent: "Two years ago, I thought I would never be able to speak about what happened to me. The fear, shame, and trauma felt insurmountable. But with the help of an incredible therapist and the support of this community, I've found my voice again. Today, I stand as a survivor, not a victim. My journey wasn't easy - there were dark days when getting out of bed felt impossible. But slowly, with professional help and the love of family and friends, I began to heal. I learned that healing isn't linear, and that's okay. Some days are harder than others, but I've learned to be gentle with myself. To anyone reading this who is still in the midst of their struggle - you are not alone. Your voice matters. Your story matters. And most importantly, you matter.",
        author: {
            name: "Sarah M.",
            anonymous: false,
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=150&h=150&fit=crop&crop=face",
            isVerified: true
        },
        timestamp: "2024-01-10",
        category: "healing",
        likes: 156,
        comments: 23,
        views: 892,
        tags: ["healing", "therapy", "community"],
        featured: true
    },
    {
        id: "STY-002",
        title: "Breaking the Cycle: How I Escaped",
        content: "For three years, I lived in fear. Every day was a battle between hope and despair. I want to share my story not for sympathy, but to show others that there is a way out...",
        fullContent: "For three years, I lived in fear. Every day was a battle between hope and despair. I want to share my story not for sympathy, but to show others that there is a way out. The hardest part wasn't the physical abuse - it was believing I deserved better. The psychological manipulation made me question my own reality. But one day, I met a woman at the grocery store who noticed my bruises and quietly handed me a card for a domestic violence shelter. That small act of kindness changed everything. It took me six months to finally call the number, but when I did, they helped me create a safety plan. The day I left was the scariest and most liberating day of my life. Today, I have my own apartment, a new job, and most importantly, my freedom. If you're reading this and you're scared to leave - please know that help is available. You deserve love, not fear.",
        author: {
            name: "Anonymous",
            anonymous: true,
            avatar: null,
            isVerified: false
        },
        timestamp: "2024-01-08",
        category: "escape",
        likes: 289,
        comments: 41,
        views: 1247,
        tags: ["domestic-violence", "escape", "shelter"],
        featured: true
    },
    {
        id: "STY-003",
        title: "Supporting My Sister Through Her Journey",
        content: "When my sister finally told me what she was going through, I felt helpless. I didn't know how to support her without making things worse. Here's what I learned about being a supportive family member...",
        fullContent: "When my sister finally told me what she was going through, I felt helpless. I didn't know how to support her without making things worse. Here's what I learned about being a supportive family member to a survivor of domestic violence. First, I had to let go of my need to 'fix' everything. My sister didn't need me to solve her problems - she needed me to listen without judgment. I learned about trauma responses and why she sometimes seemed to defend her abuser. I educated myself about the cycle of abuse and why leaving isn't always easy or safe. Most importantly, I learned to follow her lead. Some days she wanted to talk, other days she needed distraction. I made sure she knew I was always available, but I didn't pressure her. When she was ready to leave, I helped her create a safety plan and offered my home as a safe space. To other family members and friends - your support matters more than you know. Sometimes just knowing someone believes in you can make all the difference.",
        author: {
            name: "Marcus R.",
            anonymous: false,
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
            isVerified: false
        },
        timestamp: "2024-01-05",
        category: "support",
        likes: 124,
        comments: 18,
        views: 567,
        tags: ["family-support", "allies", "education"],
        featured: false
    },
    {
        id: "STY-004",
        title: "Rebuilding After Trauma: My Professional Journey",
        content: "Returning to work after experiencing trauma was one of the biggest challenges I faced. The panic attacks, the inability to concentrate, the fear of judgment from colleagues...",
        fullContent: "Returning to work after experiencing trauma was one of the biggest challenges I faced. The panic attacks, the inability to concentrate, the fear of judgment from colleagues - it all felt overwhelming. I was lucky to have an understanding HR department and a manager who supported my need for flexibility during my healing process. I started with part-time hours and gradually increased them as I felt stronger. Therapy helped me develop coping strategies for managing triggers in the workplace. I also connected with an employee resource group that provided additional support. It's been two years since I returned to work full-time, and I'm now in a leadership position where I can help create policies that support other survivors in the workplace. My advice to other survivors: don't rush your healing process, but also don't let trauma define your entire future. You are capable of so much more than you might believe right now.",
        author: {
            name: "Dr. Jennifer K.",
            anonymous: false,
            avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
            isVerified: true
        },
        timestamp: "2024-01-03",
        category: "recovery",
        likes: 98,
        comments: 15,
        views: 423,
        tags: ["workplace", "recovery", "leadership"],
        featured: false
    }
]

const Stories = () => {
    const [stories, setStories] = useState(mockStories)
    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [sortBy, setSortBy] = useState("recent")
    const [expandedStory, setExpandedStory] = useState<string | null>(null)
    const [showAddStory, setShowAddStory] = useState(false)
    const [newStory, setNewStory] = useState({
        title: "",
        content: "",
        category: "",
        anonymous: false,
        authorName: ""
    })

    const filteredStories = stories.filter(story => {
        const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            story.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            story.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesCategory = categoryFilter === "all" || story.category === categoryFilter

        return matchesSearch && matchesCategory
    }).sort((a, b) => {
        switch (sortBy) {
            case "popular":
                return b.likes - a.likes
            case "discussed":
                return b.comments - a.comments
            case "recent":
            default:
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        }
    })

    const handleLike = (storyId: string) => {
        setStories(stories.map(story =>
            story.id === storyId
                ? { ...story, likes: story.likes + 1 }
                : story
        ))
    }

    const handleAddStory = () => {
        const story = {
            id: `STY-${String(stories.length + 1).padStart(3, '0')}`,
            title: newStory.title,
            content: newStory.content.substring(0, 200) + "...",
            fullContent: newStory.content,
            author: {
                name: newStory.anonymous ? "Anonymous" : newStory.authorName,
                anonymous: newStory.anonymous,
                avatar: null,
                isVerified: false
            },
            timestamp: new Date().toISOString().split('T')[0],
            category: newStory.category,
            likes: 0,
            comments: 0,
            views: 0,
            tags: [],
            featured: false
        }

        setStories([story, ...stories])
        setNewStory({
            title: "",
            content: "",
            category: "",
            anonymous: false,
            authorName: ""
        })
        setShowAddStory(false)
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        Survivor Stories
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        A safe space to share experiences, find hope, and connect with others
                        on similar journeys of healing and recovery.
                    </p>
                </div>


                {/* Featured Stories */}
                {stories.some(s => s.featured) && (
                    <div className="max-w-6xl mx-auto mb-12">
                        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center space-x-2">
                            <Award className="h-6 w-6 text-primary" />
                            <span>Featured Stories</span>
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {stories.filter(s => s.featured).slice(0, 2).map(story => (
                                <Card key={story.id} className="border-2 border-rose-200 hover:shadow-lg transition-all duration-300">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-3">
                                                {story.author.avatar ? (
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={story.author.avatar} alt={story.author.name} />
                                                        <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                                                    </Avatar>
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                        {story.author.anonymous ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <p className="font-semibold text-sm">{story.author.name}</p>
                                                        {story.author.isVerified && <Badge className="text-xs test-red-800">Verified</Badge>}
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{new Date(story.timestamp).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="secondary">Featured</Badge>
                                        </div>
                                        <CardTitle className="text-lg hover:text-primary transition-colors cursor-pointer">
                                            {story.title}
                                        </CardTitle>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="outline" className="text-xs">
                                                {story.category.replace('-', ' ')}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="mb-4 leading-relaxed">
                                            {expandedStory === story.id ? story.fullContent : story.content}
                                        </CardDescription>

                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {story.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                    #{tag.replace('-', '')}
                                                </Badge>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                <div className="flex items-center space-x-1">
                                                    <Heart className="h-4 w-4" />
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
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                                                >
                                                    {expandedStory === story.id ? "Show Less" : "Read More"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleLike(story.id)}
                                                >
                                                    <ThumbsUp className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search and Actions */}
                <div className="max-w-6xl mx-auto mb-8">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <CardTitle className="flex items-center space-x-2">
                                    <MessageCircle className="h-5 w-5" />
                                    <span>Community Stories</span>
                                </CardTitle>
                                <Dialog open={showAddStory} onOpenChange={setShowAddStory}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Share Your Story
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Share Your Story</DialogTitle>
                                            <DialogDescription>
                                                Your story can inspire and help others. Share as much or as little as you're comfortable with.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="story-title">Story Title</Label>
                                                <Input
                                                    id="story-title"
                                                    placeholder="Give your story a title..."
                                                    value={newStory.title}
                                                    onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="story-category">Category</Label>
                                                <Select value={newStory.category} onValueChange={(value) => setNewStory({ ...newStory, category: value })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="healing">Healing Journey</SelectItem>
                                                        <SelectItem value="escape">Escape & Freedom</SelectItem>
                                                        <SelectItem value="support">Support & Allies</SelectItem>
                                                        <SelectItem value="recovery">Recovery & Growth</SelectItem>
                                                        <SelectItem value="awareness">Awareness & Education</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="story-content">Your Story</Label>
                                                <Textarea
                                                    id="story-content"
                                                    placeholder="Share your experience, insights, or message of hope..."
                                                    className="min-h-[200px]"
                                                    value={newStory.content}
                                                    onChange={(e) => setNewStory({ ...newStory, content: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="anonymous"
                                                    checked={newStory.anonymous}
                                                    onCheckedChange={(checked) => setNewStory({ ...newStory, anonymous: checked === true })}
                                                />
                                                <Label htmlFor="anonymous">Share anonymously</Label>
                                            </div>
                                            {!newStory.anonymous && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="author-name">Your Name</Label>
                                                    <Input
                                                        id="author-name"
                                                        placeholder="Enter your name or initials"
                                                        value={newStory.authorName}
                                                        onChange={(e) => setNewStory({ ...newStory, authorName: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex justify-end space-x-2">
                                                <Button variant="outline" onClick={() => setShowAddStory(false)}>
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handleAddStory}
                                                    disabled={!newStory.title || !newStory.content || !newStory.category || (!newStory.anonymous && !newStory.authorName)}
                                                >
                                                    Share Story
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search stories by title, content, or tags..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            <SelectItem value="healing">Healing Journey</SelectItem>
                                            <SelectItem value="escape">Escape & Freedom</SelectItem>
                                            <SelectItem value="support">Support & Allies</SelectItem>
                                            <SelectItem value="recovery">Recovery & Growth</SelectItem>
                                            <SelectItem value="awareness">Awareness & Education</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="recent">Recent</SelectItem>
                                            <SelectItem value="popular">Most Liked</SelectItem>
                                            <SelectItem value="discussed">Most Discussed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>


                {/* All Stories */}
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-foreground">
                            All Stories ({filteredStories.length})
                        </h2>
                    </div>

                    <div className="space-y-6">
                        {filteredStories.map(story => (
                            <Card key={story.id} className="hover:shadow-lg transition-all duration-300">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            {story.author.avatar ? (
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={story.author.avatar} alt={story.author.name} />
                                                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                    {story.author.anonymous ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-semibold text-sm">{story.author.name}</p>
                                                    {story.author.isVerified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                                                </div>
                                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{new Date(story.timestamp).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {story.category.replace('-', ' ')}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl hover:text-primary transition-colors cursor-pointer">
                                        {story.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="mb-4 leading-relaxed text-base">
                                        {expandedStory === story.id ? story.fullContent : story.content}
                                    </CardDescription>

                                    {story.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {story.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                    #{tag.replace('-', '')}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                                            <div className="flex items-center space-x-1">
                                                <Heart className="h-4 w-4" />
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
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                                            >
                                                {expandedStory === story.id ? "Show Less" : "Read More"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleLike(story.id)}
                                            >
                                                <ThumbsUp className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost">
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredStories.length === 0 && (
                        <div className="text-center py-12">
                            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">No stories found</h3>
                            <p className="text-muted-foreground">Try adjusting your search terms or filters.</p>
                        </div>
                    )}
                </div>

                {/* Community Guidelines */}
                <div className="max-w-6xl mx-auto mt-12">
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2 text-primary">
                                <Shield className="h-5 w-5" />
                                <span>Community Guidelines</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <h4 className="font-semibold mb-2">Safe Space Principles</h4>
                                    <ul className="space-y-1 text-muted-foreground">
                                        <li>• Respect everyone's journey and experiences</li>
                                        <li>• No victim blaming or judgment</li>
                                        <li>• Maintain confidentiality and privacy</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Sharing Guidelines</h4>
                                    <ul className="space-y-1 text-muted-foreground">
                                        <li>• Share only what you're comfortable with</li>
                                        <li>• Use trigger warnings when appropriate</li>
                                        <li>• Focus on healing and support</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default Stories