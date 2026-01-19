import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Paragraph } from "@/components/Paragraph";

export default function About() {
  return (
    <Container>
      <div className="py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="text-6xl mb-8">👨‍⚕️</div>
          <Heading className="font-black text-4xl mb-8">
            About Me
          </Heading>
          <Paragraph className="text-xl leading-relaxed">
            I am Akshay Kumar, a physiotherapist from Muzaffarpur, Bihar. 
            I'm passionate about teaching and exploring my profession.
          </Paragraph>
        </div>
      </div>
    </Container>
  );
}