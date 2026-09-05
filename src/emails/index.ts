import type { ReactElement } from "react";
import { render } from "@react-email/render";

export { WelcomeEmail, type WelcomeEmailProps } from "./WelcomeEmail";

/** Render a React Email element to an HTML string (for sending or previewing). */
export async function renderEmail(element: ReactElement): Promise<string> {
  return render(element);
}
