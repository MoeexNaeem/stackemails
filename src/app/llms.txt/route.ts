import { llmsIndex, textResponse } from "@/lib/llms";

export const revalidate = 3600;

export async function GET() {
  return textResponse(await llmsIndex());
}
