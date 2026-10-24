import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface WelcomeEmailProps {
  name?: string;
  product?: string;
  ctaUrl?: string;
}

/**
 * A sample transactional template built with React Email. Render it to HTML
 * with `renderEmail(<WelcomeEmail .../>)` or pass it straight to the SDK's
 * `emails.send({ react: <WelcomeEmail /> })`.
 */
export function WelcomeEmail({
  name = "there",
  product = "Acme",
  ctaUrl = "https://acme.com/get-started",
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {product}, let&apos;s get you set up.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to {product}</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Thanks for signing up. We&apos;re thrilled to have you on board. Click
            below to finish setting up your account and send your first email.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button style={button} href={ctaUrl}>
              Get started
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Sent with Stack Emails · You received this because you signed up for {product}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

const main: React.CSSProperties = { backgroundColor: "#f4f4f7", fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif" };
const container: React.CSSProperties = { backgroundColor: "#ffffff", margin: "0 auto", padding: "40px", maxWidth: "520px", borderRadius: "12px" };
const h1: React.CSSProperties = { color: "#101017", fontSize: "24px", fontWeight: 700 };
const text: React.CSSProperties = { color: "#3c3c48", fontSize: "15px", lineHeight: "24px" };
const button: React.CSSProperties = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "12px 24px", fontSize: "15px", fontWeight: 600, textDecoration: "none" };
const hr: React.CSSProperties = { borderColor: "#e5e5ea", margin: "28px 0" };
const footer: React.CSSProperties = { color: "#9a9aad", fontSize: "12px" };
