import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row as EmailRow,
  Section,
  Text,
} from "@react-email/components";

/**
 * Platform ("system") emails that Stack Emails itself sends to its own users  - 
 * welcome, password reset and payment receipts. Sent from SYSTEM_FROM_EMAIL
 * via src/lib/email/system.ts.
 */

function Layout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Stack Emails</Text>
          {children}
          <Hr style={hr} />
          <Text style={footer}>
            Stack Emails · stackemails.com
            <br />
            You received this email because of activity on your Stack Emails account.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function SystemWelcomeEmail({ name, dashboardUrl }: { name: string; dashboardUrl: string }) {
  return (
    <Layout preview="Welcome to Stack Emails. Your account is ready.">
      <Heading style={h1}>Welcome to Stack Emails</Heading>
      <Text style={text}>Hi {name},</Text>
      <Text style={text}>
        Your account is ready. To start sending, add and verify your domain, create an API key,
        and send your first email with a single API call.
      </Text>
      <Section style={{ textAlign: "center", margin: "32px 0" }}>
        <Button style={button} href={dashboardUrl}>
          Open your dashboard
        </Button>
      </Section>
      <Text style={muted}>If you didn&apos;t create this account, you can ignore this email.</Text>
    </Layout>
  );
}

export function PasswordResetEmail({ name, resetUrl, minutes }: { name: string; resetUrl: string; minutes: number }) {
  return (
    <Layout preview="Reset your Stack Emails password">
      <Heading style={h1}>Reset your password</Heading>
      <Text style={text}>Hi {name},</Text>
      <Text style={text}>
        We received a request to reset the password for your Stack Emails account. Click the
        button below to choose a new one. This link expires in {minutes} minutes and can only be
        used once.
      </Text>
      <Section style={{ textAlign: "center", margin: "32px 0" }}>
        <Button style={button} href={resetUrl}>
          Reset password
        </Button>
      </Section>
      <Text style={muted}>
        If the button doesn&apos;t work, paste this link into your browser:
        <br />
        <span style={{ wordBreak: "break-all" }}>{resetUrl}</span>
      </Text>
      <Text style={muted}>
        If you didn&apos;t request this, you can safely ignore this email. Your password won&apos;t change.
      </Text>
    </Layout>
  );
}

export function PasswordChangedEmail({ name }: { name: string }) {
  return (
    <Layout preview="Your Stack Emails password was changed">
      <Heading style={h1}>Your password was changed</Heading>
      <Text style={text}>Hi {name},</Text>
      <Text style={text}>
        The password for your Stack Emails account was just changed, and all other sessions were
        signed out.
      </Text>
      <Text style={muted}>If this wasn&apos;t you, reset your password immediately and contact support.</Text>
    </Layout>
  );
}

export function ReceiptEmail(props: {
  name: string;
  receiptId: string;
  planName: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  billingUrl: string;
}) {
  const usd = `$${props.amount.toFixed(2)}`;
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  return (
    <Layout preview={`Your Stack Emails receipt: ${usd} for ${props.planName}`}>
      <Heading style={h1}>Payment receipt</Heading>
      <Text style={text}>Hi {props.name}, thanks for your payment. Here are the details:</Text>
      <Section style={table}>
        <Row label="Receipt #" value={props.receiptId} />
        <Row label="Plan" value={props.planName} />
        <Row label="Billing period" value={`${fmt(props.periodStart)} – ${fmt(props.periodEnd)}`} />
        <Row label="Amount paid" value={usd} strong />
      </Section>
      <Section style={{ textAlign: "center", margin: "28px 0 8px" }}>
        <Button style={button} href={props.billingUrl}>
          View billing
        </Button>
      </Section>
    </Layout>
  );
}

// Table-based (Row/Column) rather than flexbox so it lines up in Outlook desktop.
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <EmailRow>
      <Column style={{ ...text, color: "#6b6b7b", padding: "6px 0" }}>{label}</Column>
      <Column align="right" style={{ ...text, fontWeight: strong ? 700 : 500, color: "#101017", padding: "6px 0" }}>
        {value}
      </Column>
    </EmailRow>
  );
}

const main: React.CSSProperties = { backgroundColor: "#f4f4f7", fontFamily: "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", padding: "24px 0" };
const container: React.CSSProperties = { backgroundColor: "#ffffff", margin: "0 auto", padding: "40px", maxWidth: "520px", borderRadius: "12px" };
const brand: React.CSSProperties = { color: "#6366f1", fontSize: "14px", fontWeight: 700, letterSpacing: "0.02em", margin: "0 0 16px" };
const h1: React.CSSProperties = { color: "#101017", fontSize: "22px", fontWeight: 700, margin: "0 0 16px" };
const text: React.CSSProperties = { color: "#3c3c48", fontSize: "15px", lineHeight: "24px" };
const muted: React.CSSProperties = { color: "#6b6b7b", fontSize: "13px", lineHeight: "20px" };
const button: React.CSSProperties = { backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", padding: "12px 24px", fontSize: "15px", fontWeight: 600, textDecoration: "none" };
const table: React.CSSProperties = { border: "1px solid #e5e5ea", borderRadius: "8px", padding: "8px 16px", margin: "16px 0" };
const hr: React.CSSProperties = { borderColor: "#e5e5ea", margin: "28px 0" };
const footer: React.CSSProperties = { color: "#9a9aad", fontSize: "12px", lineHeight: "18px" };

export function TicketEmail(props: { heading: string; name: string; number: number; subject: string; body: string; footer: string; staffReply?: boolean }) {
  return (
    <Layout preview={`#${props.number} ${props.subject}`}>
      <Heading style={h1}>{props.heading}</Heading>
      <Text style={text}>Hi {props.name},</Text>
      <Section style={table}>
        <Text style={{ ...muted, margin: "4px 0" }}>Ticket #{props.number} · {props.subject}</Text>
        <Text style={{ ...text, whiteSpace: "pre-wrap" }}>{props.body}</Text>
      </Section>
      <Text style={muted}>{props.footer}</Text>
    </Layout>
  );
}

export function InviteEmail({ inviter, team, role, acceptUrl }: { inviter: string; team: string; role: string; acceptUrl: string }) {
  return (
    <Layout preview={`${inviter} invited you to ${team} on Stack Emails`}>
      <Heading style={h1}>Join {team} on Stack Emails</Heading>
      <Text style={text}>
        {inviter} invited you to the <strong>{team}</strong> team as {role === "admin" ? "an admin" : "a member"}. Accept to view
        emails, domains and analytics together.
      </Text>
      <Section style={{ textAlign: "center", margin: "32px 0" }}>
        <Button style={button} href={acceptUrl}>Accept invitation</Button>
      </Section>
      <Text style={muted}>This invitation expires in 7 days. If you weren&apos;t expecting it, you can ignore this email.</Text>
    </Layout>
  );
}

export function NoticeEmail({ heading, paragraphs, cta }: { heading: string; paragraphs: string[]; cta?: { label: string; href: string } }) {
  return (
    <Layout preview={heading}>
      <Heading style={h1}>{heading}</Heading>
      {paragraphs.map((p, i) => <Text key={i} style={text}>{p}</Text>)}
      {cta && (
        <Section style={{ textAlign: "center", margin: "28px 0 8px" }}>
          <Button style={button} href={cta.href}>{cta.label}</Button>
        </Section>
      )}
    </Layout>
  );
}
