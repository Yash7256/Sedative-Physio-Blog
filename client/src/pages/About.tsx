import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight">About</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        This is the About page. It lives in{" "}
        <code className="rounded bg-secondary px-1.5 py-0.5 text-sm">
          src/pages/About.tsx
        </code>{" "}
        and shares the Navbar and Footer through the layout.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  )
}
