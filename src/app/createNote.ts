import {App, normalizePath, TFile } from "obsidian";

const MARKDOWN_FENCE_PATTERN = /^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i;


export async function createMarkdownNote(app: App, imageFile: TFile, markdown: string): Promise<TFile> {
  const notePath = getSiblingMarkdownPath(imageFile);
  const existingNote = app.vault.getAbstractFileByPath(notePath);

  if (existingNote instanceof TFile) {
    throw new Error(`A note with the same name already exists: ${notePath}`);
  }

  if (existingNote) {
    throw new Error(`The target path is already occupied by a folder: ${notePath}`);
  }

  return app.vault.create(notePath, ensureTrailingNewline(markdown));
}

function getSiblingMarkdownPath(imageFile: TFile): string {
  const parentPath = imageFile.parent?.path ?? "";
  const noteName = `${imageFile.basename}.md`;

  return normalizePath(parentPath ? `${parentPath}/${noteName}` : noteName);
}

function ensureTrailingNewline(markdown: string): string {
  return markdown.endsWith("\n") ? markdown : `${markdown}\n`;
}

export function cleanMarkdown(markdown: string): string {
  const trimmed = markdown.trim();
  const fenceMatch = trimmed.match(MARKDOWN_FENCE_PATTERN);

  return fenceMatch?.[1]?.trim() ?? trimmed;
}
