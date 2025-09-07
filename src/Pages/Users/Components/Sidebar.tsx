import { BookAIcon, User, Shield, SquarePen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const sidebarNavItems = [
    {
        title: "Profile",
        icon: <User className="h-4 w-4" />,
        href: "/account/profile",
    },
    {
        title: "Security",
        icon: <Shield className="h-4 w-4" />,
        href: "/account/password-settings",
    },
    {
        title: "My Stories",
        icon: <BookAIcon className="h-4 w-4" />,
        href: "/account/my-stories",
    },
    {
        title: "New Story",
        icon: <SquarePen className="h-4 w-4" />,
        href: "/account/my-stories/new",
    },
];

const Sidebar = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.pathname);

    return (
        <>
            {/* Sidebar Navigation */}
            <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-20rem)] w-full shrink-0 md:sticky md:block border rounded-2xl p-4 md:pr-6">
                <nav className="grid items-start gap-2">
                    {sidebarNavItems.map((item) => (
                        <Button
                            key={item.href}
                            className={`justify-start ${activeTab === item.href
                                    ? "bg-primary text-white shadow-2xl hover:bg-primary/80"
                                    : "bg-white text-black shadow-2xl hover:bg-primary/80 hover:text-white "
                                }`}
                            asChild
                        >
                            <Link to={item.href} onClick={() => setActiveTab(item.href)}>
                                {item.icon}
                                <span className="ml-2">{item.title}</span>
                            </Link>
                        </Button>
                    ))}
                </nav>
            </aside>

            {/* Mobile Navigation */}
            <div className="flex items-center justify-between md:hidden mb-6">
                <h1 className="text-sm font-Lora sm:text-lg font-bold tracking-tight">Settings</h1>
                <Select
                    value={activeTab}
                    onValueChange={(value) => {
                        setActiveTab(value);
                        window.location.href = value;
                    }}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                        {sidebarNavItems.map((item) => (
                            <SelectItem key={item.href} value={item.href}>
                                <div className="flex items-center">
                                    {item.icon}
                                    <span className="ml-2">{item.title}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    );
};

export default Sidebar;
