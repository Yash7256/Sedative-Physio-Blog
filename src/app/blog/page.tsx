import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Highlight } from "@/components/Highlight";
import { Paragraph } from "@/components/Paragraph";
import BlogClient from "@/components/BlogClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Medical Research & Physiotherapy Insights",
  description:
    "Evidence-based research and clinical insights in physiotherapy, rehabilitation medicine, and movement science.",
};

export default function Blog() {
  return (
    <Container>
      <BlogClient />
    </Container>
  );
}