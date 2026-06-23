export interface RenderSlidesResult {
  slide_images: string[];
  render_backend?: string;
  render_error?: string | null;
}

/**
 * Request pixel-accurate slide PNGs from /api/render-slides (ConvertAPI on Vercel).
 * Uses multipart upload to avoid base64 size overhead on Vercel's 4.5 MB limit.
 */
export async function renderSlidesInBrowser(
  file: File,
  signal?: AbortSignal,
): Promise<RenderSlidesResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/render-slides", {
    method: "POST",
    credentials: "include",
    body: formData,
    signal,
  });

  if (!res.ok) {
    return { slide_images: [], render_error: `Render failed (${res.status})` };
  }

  return res.json() as Promise<RenderSlidesResult>;
}

export async function fetchRenderStatus(): Promise<{
  configured: boolean;
  backend: string;
}> {
  const res = await fetch("/api/render-status", { credentials: "include" });
  if (!res.ok) {
    return { configured: false, backend: "html-fallback" };
  }
  return res.json();
}
