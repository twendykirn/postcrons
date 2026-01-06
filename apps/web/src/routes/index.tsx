import { SignInButton, useUser } from "@clerk/tanstack-react-start";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@postcrons/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Calendar, Clock, Image, Zap, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const features = [
  {
    icon: Clock,
    title: "Reliable Scheduling",
    description: "Schedule posts with Convex's reliable serverless functions. No more missed posts due to unreliable platform schedulers.",
  },
  {
    icon: Calendar,
    title: "Calendar View",
    description: "Visualize and manage all your scheduled posts in an intuitive calendar interface. Plan content weeks ahead.",
  },
  {
    icon: Image,
    title: "Media Management",
    description: "Upload and organize images and videos. Attach them to your posts with ease.",
  },
  {
    icon: Zap,
    title: "Multi-Platform",
    description: "Post to Twitter/X, LinkedIn, Bluesky, and Threads from a single dashboard.",
  },
];

function HomeComponent() {
  const healthCheck = useQuery(convexQuery(api.healthCheck.get, {}));
  const { user, isLoaded } = useUser();

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-12 md:py-20 px-4">
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Schedule Social Media Posts
            <span className="text-primary"> Without the Headache</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            An open-source scheduling platform that uses Convex scheduled functions
            for reliable post delivery. No more missed posts from unreliable platform schedulers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isLoaded && user ? (
              <Link to="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            ) : (
              <SignInButton mode="modal">
                <Button size="lg">Get Started</Button>
              </SignInButton>
            )}
            <a
              href="https://github.com/postcrons/postcrons"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg">
                View on GitHub
              </Button>
            </a>
          </div>

          {/* API Status */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div
              className={`h-2 w-2 rounded-full ${healthCheck.data === "OK" ? "bg-green-500" : healthCheck.isLoading ? "bg-orange-400 animate-pulse" : "bg-red-500"}`}
            />
            <span>
              {healthCheck.isLoading
                ? "Connecting to API..."
                : healthCheck.data === "OK"
                  ? "API Connected"
                  : "API Error"}
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4 border-t bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-8">
            Why PostCrons?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} size="sm">
                  <CardHeader className="pb-2">
                    <Icon className="size-8 text-primary mb-2" />
                    <CardTitle className="text-sm">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-12 px-4 border-t">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-8">
            How It Works
          </h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Connect Your Accounts", desc: "Link your social media accounts using post-for-me" },
              { step: "2", title: "Upload Media", desc: "Add images and videos to your media library" },
              { step: "3", title: "Schedule Posts", desc: "Create posts and set the exact time for publishing" },
              { step: "4", title: "Relax", desc: "Convex handles the rest with reliable scheduled functions" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 border-t bg-muted/30">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h2 className="text-xl md:text-2xl font-bold">
            Ready to Start Scheduling?
          </h2>
          <p className="text-sm text-muted-foreground">
            Join PostCrons and never miss a scheduled post again.
          </p>
          {isLoaded && user ? (
            <Link to="/dashboard">
              <Button size="lg">Open Dashboard</Button>
            </Link>
          ) : (
            <SignInButton mode="modal">
              <Button size="lg">Sign Up Free</Button>
            </SignInButton>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Open source. Built with Convex, TanStack, and post-for-me.
        </p>
      </footer>
    </div>
  );
}
