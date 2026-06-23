"use client";

import { useState, useRef } from "react";
import { UploadPage } from "@/components/upload/UploadPage";
import { AnalyzingPage } from "@/components/upload/AnalyzingPage";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";
import { PresentationAnalysis, PresentationMetadata } from "@/lib/types";
import { parsePptxInBrowser } from "@/lib/utils/parse-pptx-client";
import { renderSlidesInBrowser } from "@/lib/utils/render-slides-client";

type AppView = "upload" | "analyzing" | "review";
type AnalyzePhase = "parse" | "rules" | "render";

async function readAnalysisResponse(
  res: Response,
): Promise<PresentationAnalysis & { error?: string; status?: string }> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  if (res.status === 504) {
    throw new Error(
      "Analysis timed out. Try enabling “Skip AI checks” or use a smaller deck.",
    );
  }
  throw new Error(text.slice(0, 200) || `Request failed (${res.status})`);
}

export default function HomePage() {
  const [view, setView] = useState<AppView>("upload");
  const [analysis, setAnalysis] = useState<PresentationAnalysis | null>(null);
  const [error, setError] = useState<string>();
  const [uploadingFile, setUploadingFile] = useState<string>("");
  const [analyzePhase, setAnalyzePhase] = useState<AnalyzePhase>("parse");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleUpload(file: File, options: { skipAi: boolean }) {
    setError(undefined);
    setRenderError(null);
    setUploadingFile(file.name);
    setUploadedFile(file);
    setAnalyzePhase("parse");
    setView("analyzing");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let res: Response;
      let renderedImages: string[] | undefined;

      try {
        const metadata: PresentationMetadata = await parsePptxInBrowser(
          file,
          controller.signal,
        );

        setAnalyzePhase("rules");

        const { slide_images: _omit, ...metadataForAnalysis } = metadata;
        void _omit;

        res = await fetch("/api/analyze", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metadata: metadataForAnalysis,
            filename: file.name,
            skipAi: options.skipAi,
          }),
          signal: controller.signal,
        });

        setAnalyzePhase("render");

        const renderRes = await renderSlidesInBrowser(file, controller.signal);
        if (renderRes.slide_images.length > 0) {
          renderedImages = renderRes.slide_images;
        } else if (renderRes.render_error) {
          setRenderError(renderRes.render_error);
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.name === "AbortError") {
          throw parseError;
        }

        const unavailable =
          parseError instanceof TypeError ||
          (parseError instanceof Error &&
            (parseError.message === "PPTX_PARSE_UNAVAILABLE" ||
              parseError.message.includes("(404)")));

        if (!unavailable) {
          throw parseError;
        }

        setAnalyzePhase("rules");

        const formData = new FormData();
        formData.append("file", file);
        if (options.skipAi) formData.append("skipAi", "true");

        res = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      }

      const data = await readAnalysisResponse(res);

      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
        setView("upload");
        return;
      }

      if (data.status === "error") {
        setError(data.error ?? "Failed to parse presentation");
        setView("upload");
        return;
      }

      const analysisResult = data as PresentationAnalysis;
      if (renderedImages?.length && analysisResult.metadata) {
        analysisResult.metadata.slide_images = renderedImages;
      }

      setAnalysis(analysisResult);
      setView("review");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setView("upload");
        return;
      }
      setError(e instanceof Error ? e.message : "Network error");
      setView("upload");
    } finally {
      abortRef.current = null;
    }
  }

  function handleCancelAnalyzing() {
    abortRef.current?.abort();
    setView("upload");
    setUploadingFile("");
    setUploadedFile(null);
  }

  function handleBackToUpload() {
    setAnalysis(null);
    setUploadedFile(null);
    setView("upload");
    setError(undefined);
    setRenderError(null);
  }

  function handleSlideImagesReady(images: string[]) {
    setAnalysis((prev) =>
      prev
        ? {
            ...prev,
            metadata: { ...prev.metadata, slide_images: images },
          }
        : prev,
    );
    setRenderError(null);
  }

  if (view === "analyzing") {
    return (
      <AnalyzingPage
        filename={uploadingFile}
        phase={analyzePhase}
        onCancel={handleCancelAnalyzing}
      />
    );
  }

  if (view === "review" && analysis) {
    return (
      <ReviewWorkspace
        initialAnalysis={analysis}
        uploadFile={uploadedFile}
        renderError={renderError}
        onSlideImagesReady={handleSlideImagesReady}
        onBack={handleBackToUpload}
      />
    );
  }

  return <UploadPage onUpload={handleUpload} error={error} />;
}
