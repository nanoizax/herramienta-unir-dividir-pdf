import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, X, FileText } from "lucide-react";
import ToolPageLayout from "@/components/tools/ToolPageLayout";
import FileDropZone from "@/components/tools/FileDropZone";
import { Button } from "@/components/ui/button";
import { bundleSplitAsZip, mergePdfs, splitPdf, type SplitPage } from "@/lib/tools/mergeSplitPdf";
import { formatBytes } from "@/lib/tools/compressFile";

type Mode = "merge" | "split";

const UnirDividirPdfPage = () => {
  const { t } = useTranslation("tools");
  const [mode, setMode] = useState<Mode>("merge");

  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);

  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitPages, setSplitPages] = useState<SplitPage[] | null>(null);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeMode = (next: Mode) => {
    setMode(next);
    setMergeFiles([]);
    setMergedUrl(null);
    setSplitFile(null);
    setSplitPages(null);
    setError(null);
  };

  const addMergeFiles = (files: File[]) => {
    setMergedUrl(null);
    setError(null);
    setMergeFiles((prev) => [...prev, ...files]);
  };

  const removeMergeFile = (index: number) => {
    setMergedUrl(null);
    setMergeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (mergeFiles.length < 2) return;
    setProcessing(true);
    setError(null);
    try {
      const blob = await mergePdfs(mergeFiles);
      setMergedUrl(URL.createObjectURL(blob));
    } catch {
      setError(t("ui.error_generic"));
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitFile = (file: File) => {
    setSplitFile(file);
    setSplitPages(null);
    setError(null);
  };

  const handleSplit = async () => {
    if (!splitFile) return;
    setProcessing(true);
    setError(null);
    try {
      const pages = await splitPdf(splitFile);
      setSplitPages(pages);
    } catch {
      setError(t("ui.error_generic"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadSplitZip = async () => {
    if (!splitPages || !splitFile) return;
    setProcessing(true);
    try {
      const base = splitFile.name.replace(/\.pdf$/i, "");
      const blob = await bundleSplitAsZip(base, splitPages);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("ui.error_generic"));
    } finally {
      setProcessing(false);
    }
  };

  const modeButtonClass = (active: boolean) =>
    `rounded-full px-6 ${
      active
        ? "bg-white text-black hover:bg-white/80"
        : "bg-transparent text-white border border-neutral-700 hover:bg-white/10"
    }`;

  return (
    <ToolPageLayout toolId="unir-dividir-pdf">
      <div className="flex justify-center gap-3 mb-6">
        <Button onClick={() => changeMode("merge")} className={modeButtonClass(mode === "merge")}>
          {t("ui.merge_mode_button")}
        </Button>
        <Button onClick={() => changeMode("split")} className={modeButtonClass(mode === "split")}>
          {t("ui.split_mode_button")}
        </Button>
      </div>

      <div className="border border-neutral-800 rounded-xl p-6 md:p-8">
        {mode === "merge" ? (
          <div className="space-y-4">
            <FileDropZone
              accept="application/pdf,.pdf"
              label={t("ui.upload_label_pdf_multiple")}
              hint={t("ui.upload_hint_pdf")}
              multiple
              onFile={() => {}}
              onFiles={addMergeFiles}
              toolId="unir-dividir-pdf"
            />

            {mergeFiles.length > 0 && (
              <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
                {mergeFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-neutral-500 shrink-0" />
                      <span className="text-sm text-neutral-300 truncate">{file.name}</span>
                    </div>
                    <button
                      onClick={() => removeMergeFile(i)}
                      className="text-neutral-500 hover:text-white transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex flex-wrap gap-3">
              {!mergedUrl ? (
                <Button
                  onClick={handleMerge}
                  disabled={mergeFiles.length < 2}
                  isLoading={processing}
                  loadingText={t("ui.processing")}
                  className="bg-white text-black hover:bg-white/80 rounded-full px-8"
                >
                  {t("ui.merge_button")}
                </Button>
              ) : (
                <a href={mergedUrl} download="unido.pdf">
                  <Button className="bg-white text-black hover:bg-white/80 rounded-full px-8">
                    <Download className="w-4 h-4" />
                    {t("ui.download_button")}
                  </Button>
                </a>
              )}
            </div>
            {mergeFiles.length === 1 && (
              <p className="text-neutral-500 text-xs">{t("ui.merge_need_two_notice")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!splitFile ? (
              <FileDropZone
                accept="application/pdf,.pdf"
                label={t("ui.upload_label_pdf")}
                hint={t("ui.upload_hint_pdf")}
                onFile={handleSplitFile}
                toolId="unir-dividir-pdf"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400 truncate max-w-[60%]">{splitFile.name}</span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSplitFile(null);
                      setSplitPages(null);
                    }}
                    className="rounded-full px-6 border-neutral-700 text-white bg-transparent hover:bg-white/10"
                  >
                    {t("ui.reset_button_file")}
                  </Button>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                {!splitPages ? (
                  <Button
                    onClick={handleSplit}
                    isLoading={processing}
                    loadingText={t("ui.processing")}
                    className="bg-white text-black hover:bg-white/80 rounded-full px-8"
                  >
                    {t("ui.split_button")}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 text-sm">
                        {t("ui.split_page_count", { count: splitPages.length })}
                      </span>
                      <Button
                        onClick={handleDownloadSplitZip}
                        isLoading={processing}
                        loadingText={t("ui.processing")}
                        className="bg-white text-black hover:bg-white/80 rounded-full px-6"
                      >
                        <Download className="w-4 h-4" />
                        {t("ui.download_all_button")}
                      </Button>
                    </div>
                    <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800 max-h-[24rem] overflow-y-auto">
                      {splitPages.map((page) => (
                        <div
                          key={page.pageNumber}
                          className="flex items-center justify-between gap-3 px-4 py-2.5"
                        >
                          <span className="text-sm text-neutral-300">
                            {t("ui.split_page_label", { number: page.pageNumber })}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-neutral-500">
                              {formatBytes(page.blob.size)}
                            </span>
                            <a
                              href={URL.createObjectURL(page.blob)}
                              download={`${splitFile.name.replace(/\.pdf$/i, "")}-pagina-${String(
                                page.pageNumber
                              ).padStart(3, "0")}.pdf`}
                              className="text-neutral-400 hover:text-white transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default UnirDividirPdfPage;
