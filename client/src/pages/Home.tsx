import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "react-router-dom"

const features = [
  {
    title: "Scalable",
    description:
      "Shared components and page-based routing keep the codebase easy to maintain as it grows.",
  },
  {
    title: "Tailwind + shadcn",
    description:
      "Ready-made UI primitives styled with a consistent design system.",
  },
  {
    title: "Type Safe",
    description: "Built entirely with TypeScript for confidence at scale.",
  },
]

export function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="text-center">
        <Badge className="mb-4">New Design</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          From Scratch, Built to Scale
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          A fresh start for the Sedative Physio Blog — structured with reusable
          components and dedicated pages.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild>
            <Link to="/about">Learn More</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/about">Get Started</Link>
          </Button>
        </div>
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
