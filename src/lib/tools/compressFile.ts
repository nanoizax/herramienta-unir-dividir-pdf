import { PDFDocument } from "pdf-lib";
import pdfjsLib from "./pdfjs";

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/** Compresion real de imagen (recodifica/redimensiona) via browser-image-compression. */
export async function compressImage(file: File, maxSizeMB: number): Promise<File> {
  const imageCompression = (await import("browser-image-compression")).default;
  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: 2560,
    useWebWorker: true,
    initialQuality: 0.8,
  });
}

export interface PdfCompressProgress {
  stage: "analyzing" | "rendering";
  page: number;
  totalPages: number;
}

const TARGET_MEGAPIXELS = 20; // presupuesto de pixeles de salida por pagina (preserva legibilidad)
const MIN_SCALE = 0.15; // nunca reducir mas alla de esto, aunque la pagina sea enorme
const JPEG_QUALITY = 0.75;
const MIN_PRINTABLE_CHARS_PER_PAGE = 20; // por debajo de esto se asume escaneado/solo imagenes
const HEAVY_BYTES_PER_PAGE = 300 * 1024; // 300KB/pagina: un documento de texto normal no llega ni cerca

// Solo cuenta letras/numeros/puntuacion/espacios reales. Algunos generadores de
// PDF (capturas de pantalla convertidas con una fuente mal mapeada) dejan una
// "capa de texto" que en realidad son bytes de control sin sentido: cuentan
// como caracteres para content.items pero no sirven para decidir si el PDF
// tiene texto util. Sin este filtro, esa basura pasa el umbral y el PDF
// termina compactandose por estructura en vez de recomprimirse de verdad.
function countPrintableChars(text: string): number {
  return (text.match(/[\p{L}\p{N}\p{P}\s]/gu) || []).length;
}

async function averagePrintableCharsPerPage(pdf: pdfjsLib.PDFDocumentProxy): Promise<number> {
  let totalChars = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join("");
    totalChars += countPrintableChars(pageText);
  }
  return totalChars / pdf.numPages;
}

/**
 * PDF dominado por imagenes (escaneos, capturas de pantalla): la unica forma
 * de bajar el peso de verdad es volver a dibujar cada pagina a una resolucion
 * razonable y reencodearla como JPEG. Esto aplana el PDF a imagenes -se pierde
 * el texto seleccionable si lo tuviera-, por eso solo se usa cuando el PDF ya
 * casi no tiene texto nativo (ver averageCharsPerPage).
 */
async function rasterizeAndCompress(
  pdf: pdfjsLib.PDFDocumentProxy,
  onProgress?: (progress: PdfCompressProgress) => void
): Promise<Blob> {
  const outPdf = await PDFDocument.create();

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.({ stage: "rendering", page: i, totalPages: pdf.numPages });

    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    // Presupuesto por megapixeles en vez de un tope de lado fijo: una pagina
    // normal (carta/A4) y una pagina gigante de capturas apiladas (mismo
    // ancho, alto extremo) necesitan escalas muy distintas para terminar en
    // un tamano de salida parecido sin destruir la legibilidad de ninguna.
    const nativeMegapixels = (baseViewport.width * baseViewport.height) / 1_000_000;
    const scale = Math.min(Math.sqrt(TARGET_MEGAPIXELS / nativeMegapixels), 1);
    const viewport = page.getViewport({ scale: Math.max(scale, MIN_SCALE) });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear el contexto de canvas");
    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))),
        "image/jpeg",
        JPEG_QUALITY
      );
    });
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const embeddedImage = await outPdf.embedJpg(jpegBytes);

    // La pagina de salida mantiene el tamano original en puntos (no en px de
    // render) para que el resultado se vea/imprima al mismo tamano que el PDF
    // original, aunque adentro la imagen este a menor resolucion.
    const outPage = outPdf.addPage([baseViewport.width, baseViewport.height]);
    outPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });
  }

  const bytes = await outPdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}

/**
 * Compresion de PDF: si el documento tiene texto nativo real, se preserva
 * (solo se compacta la estructura interna, pdf-lib useObjectStreams). Si es
 * basicamente imagenes/escaneado -el caso que de verdad pesa mucho-, se
 * rasteriza y recomprime pagina por pagina, que es lo unico que baja el peso
 * de forma real en ese caso.
 */
export async function compressPdf(
  file: File,
  onProgress?: (progress: PdfCompressProgress) => void
): Promise<Blob> {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  onProgress?.({ stage: "analyzing", page: 0, totalPages: pdf.numPages });

  // Dos señales independientes de "esto pesa por las imágenes, no por el texto":
  // (a) casi no hay texto real de verdad (ya filtrado de basura de fuentes rotas), o
  // (b) el archivo pesa muchísimo más por página de lo que un documento de
  //     texto normal pesaría -esto solo, sin mirar el texto, ya delata un PDF
  //     de capturas de pantalla o escaneos, incluso si tiene alguna leyenda
  //     con texto real de verdad seleccionable mezclada adentro-.
  // Alcanza con que se cumpla UNA de las dos para rasterizar: preferimos
  // arriesgarnos a rasterizar de más antes que repetir el caso real donde un
  // PDF de 135MB de capturas con dos textos sueltos quedaba "intacto".
  const bytesPerPage = file.size / pdf.numPages;
  const avgPrintableChars = await averagePrintableCharsPerPage(pdf);
  const looksImageHeavy =
    bytesPerPage > HEAVY_BYTES_PER_PAGE || avgPrintableChars <= MIN_PRINTABLE_CHARS_PER_PAGE;

  if (!looksImageHeavy) {
    const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const compressed = await pdfDoc.save({ useObjectStreams: true });
    return new Blob([compressed], { type: "application/pdf" });
  }

  return rasterizeAndCompress(pdf, onProgress);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
