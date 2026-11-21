import { PDFDocument } from "pdf-lib";

export async function mergePdfs(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  const bytes = await merged.save();
  return new Blob([bytes], { type: "application/pdf" });
}

export interface SplitPage {
  pageNumber: number;
  blob: Blob;
}

export async function splitPdf(file: File): Promise<SplitPage[]> {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const count = src.getPageCount();
  const results: SplitPage[] = [];

  for (let i = 0; i < count; i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
    const bytes = await doc.save();
    results.push({ pageNumber: i + 1, blob: new Blob([bytes], { type: "application/pdf" }) });
  }

  return results;
}

export async function bundleSplitAsZip(baseName: string, pages: SplitPage[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const page of pages) {
    const num = String(page.pageNumber).padStart(3, "0");
    zip.file(`${baseName}-pagina-${num}.pdf`, await page.blob.arrayBuffer());
  }
  return zip.generateAsync({ type: "blob" });
}
