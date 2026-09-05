import { randomBytes } from "node:crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { User, Workspace, Membership } from "@/lib/db/models";
import { hashPassword } from "@/lib/auth/password";
import { randomId } from "@/lib/ids";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

/**
 * Create a new user, a workspace they own, and the linking membership.
 * Returns the created user id. Throws { code } on conflict.
 */
export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
  workspaceName?: string;
}): Promise<{ userId: string }> {
  await connectToDatabase();

  const existing = await User.findOne({ email: input.email });
  if (existing) throw Object.assign(new Error("Email already in use"), { code: "email_taken" });

  const user = await User.create({
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
  });

  const baseSlug = slugify(input.workspaceName || `${input.name}s-workspace`);
  const workspace = await Workspace.create({
    name: input.workspaceName || `${input.name}'s Workspace`,
    slug: `${baseSlug}-${randomId(6)}`,
    ownerId: user._id,
    webhookSecret: `whsec_${randomBytes(24).toString("hex")}`,
  });

  await Membership.create({
    workspaceId: workspace._id,
    userId: user._id,
    role: "owner",
  });

  return { userId: String(user._id) };
}
