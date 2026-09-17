import { App, TFile } from "obsidian";


const IMAGE_MIME_TYPES: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export async function getImageDataUrl(app: App, imageFile: TFile): Promise<string> {
  const mimeType = IMAGE_MIME_TYPES[imageFile.extension.toLowerCase()] ?? "application/octet-stream";
  const binary = await app.vault.readBinary(imageFile);

  return `data:${mimeType};base64,${arrayBufferToBase64(binary)}`;
}
