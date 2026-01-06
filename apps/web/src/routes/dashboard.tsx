import { SignInButton, UserButton, useUser } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Calendar, Home, Image } from "lucide-react";
import { useState } from "react";

import { CalendarTab } from "@/components/dashboard/calendar-tab";
import { HomeTab } from "@/components/dashboard/home-tab";
import { MediaTab } from "@/components/dashboard/media-tab";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

type TabId = "home" | "media" | "calendar";

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "media", label: "Media", icon: Image },
  { id: "calendar", label: "Calendar", icon: Calendar },
];

function RouteComponent() {
  return (
    <>
      <Authenticated>
        <Dashboard />
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Welcome to PostCrons</h1>
            <p className="text-muted-foreground">
              Sign in to start scheduling your social media posts
            </p>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
    </>
  );
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const user = useUser();

  return (
    <div className="flex flex-col h-full">
      {/* Dashboard Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold hidden sm:block">Dashboard</h1>
            {/* Tab Navigation */}
            <nav className="flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className="gap-1.5"
                  >
                    <Icon className="size-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Button>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {user.user?.fullName || user.user?.emailAddresses[0]?.emailAddress}
            </span>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8",
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "media" && <MediaTab />}
        {activeTab === "calendar" && <CalendarTab />}
      </div>
    </div>
  );
}
