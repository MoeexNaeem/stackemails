/** Built-in starter templates users can duplicate into their workspace. */
export interface StarterTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  html: string;
}

const shell = (body: string) =>
  `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f7;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px">
${body}
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0"/>
    <p style="color:#9a9aad;font-size:12px">Sent with Stack Emails</p>
  </div>
</div>`;

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "welcome",
    name: "Welcome",
    category: "Onboarding",
    subject: "Welcome to {{product}}",
    html: shell(`    <h1 style="font-size:22px;color:#101017">Welcome to {{product}}</h1>
    <p style="color:#3c3c48;line-height:24px">Hi {{name}}, thanks for signing up. Click below to finish setting up your account.</p>
    <p style="text-align:center;margin:28px 0"><a href="{{url}}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Get started</a></p>`),
  },
  {
    id: "password-reset",
    name: "Password reset",
    category: "Transactional",
    subject: "Reset your password",
    html: shell(`    <h1 style="font-size:22px;color:#101017">Reset your password</h1>
    <p style="color:#3c3c48;line-height:24px">We received a request to reset your password. This link expires in 30 minutes.</p>
    <p style="text-align:center;margin:28px 0"><a href="{{url}}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
    <p style="color:#9a9aad;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`),
  },
  {
    id: "magic-link",
    name: "Magic link",
    category: "Transactional",
    subject: "Your sign-in link",
    html: shell(`    <h1 style="font-size:22px;color:#101017">Sign in to {{product}}</h1>
    <p style="color:#3c3c48;line-height:24px">Click the button below to sign in. This link is single-use and expires shortly.</p>
    <p style="text-align:center;margin:28px 0"><a href="{{url}}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>`),
  },
  {
    id: "receipt",
    name: "Receipt",
    category: "Transactional",
    subject: "Your receipt from {{product}}",
    html: shell(`    <h1 style="font-size:22px;color:#101017">Thanks for your purchase</h1>
    <p style="color:#3c3c48;line-height:24px">Here's your receipt for order <b>{{order_id}}</b>.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <tr><td style="padding:8px 0;color:#3c3c48">{{item}}</td><td style="padding:8px 0;text-align:right;color:#101017">{{amount}}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #eee;font-weight:600">Total</td><td style="padding:8px 0;border-top:1px solid #eee;text-align:right;font-weight:600">{{total}}</td></tr>
    </table>`),
  },
  {
    id: "newsletter",
    name: "Newsletter",
    category: "Marketing",
    subject: "{{product}}: what's new this month",
    html: shell(`    <h1 style="font-size:22px;color:#101017">What's new this month</h1>
    <p style="color:#3c3c48;line-height:24px">Here are the latest updates and highlights from the team.</p>
    <ul style="color:#3c3c48;line-height:26px"><li>Feature one</li><li>Feature two</li><li>Feature three</li></ul>
    <p style="text-align:center;margin:28px 0"><a href="{{url}}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Read more</a></p>`),
  },
  {
    id: "blank",
    name: "Blank",
    category: "Custom",
    subject: "",
    html: shell(`    <h1 style="font-size:22px;color:#101017">Heading</h1>
    <p style="color:#3c3c48;line-height:24px">Start writing your email here.</p>`),
  },
];

export function getStarter(id: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((t) => t.id === id);
}
