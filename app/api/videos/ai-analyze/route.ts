export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/** Thin route entry — OpenAI env is only read inside dynamically imported server modules at request time. */
export async function POST(req: Request): Promise<Response> {
  const { handleVideoAiAnalyzePost } = await import(
    "@/lib/ai/videoAiAnalyzePost.server"
  );
  return handleVideoAiAnalyzePost(req);
}
