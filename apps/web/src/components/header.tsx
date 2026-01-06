import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";

export default function Header() {
  return (
    <div className="border-b">
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Clock className="size-5 text-primary" />
          <span className="font-semibold text-sm">PostCrons</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="px-3 py-1.5 text-xs hover:bg-muted transition-colors"
            activeProps={{ className: "bg-muted" }}
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className="px-3 py-1.5 text-xs hover:bg-muted transition-colors"
            activeProps={{ className: "bg-muted" }}
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </div>
  );
}
