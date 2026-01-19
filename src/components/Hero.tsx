import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Paragraph } from "@/components/Paragraph";
import { Highlight } from "@/components/Highlight";

export function Hero() {
  return (
    <Container>
      <span className="text-4xl">🏥</span>
      <Heading className="font-black">Welcome to Medical Science Insights</Heading>
      <Paragraph className="max-w-xl mt-4">
        Advancing <Highlight>physiotherapy</Highlight> and rehabilitation medicine through 
        evidence-based research and clinical innovation
      </Paragraph>
      <Paragraph className="max-w-xl mt-4">
        Dedicated to bridging <Highlight>medical research</Highlight> with practical therapeutic 
        applications that improve patient outcomes and quality of life
      </Paragraph>
    </Container>
  );
}