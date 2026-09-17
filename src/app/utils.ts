export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    const value = bytes[i];
    if (value !== undefined) {
      binary += String.fromCharCode(value);
    }
  }
  return btoa(binary);
}
