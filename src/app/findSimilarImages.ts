import { TFile } from "obsidian";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];
const SUFFIX_PATTERN = /[-_]\d+$/;

export function findSimilarImages(siblingFiles: TFile[], baseFile: TFile): TFile[] {
	// Extract root name by removing trailing suffix like -01, _2, etc.
	const baseName = baseFile.basename;
	const rootName = baseName.replace(SUFFIX_PATTERN, "");

	const pattern = new RegExp(`^${escapeRegExp(rootName)}([-_]\\d+)?$`, "i");

	const matches: TFile[] = [];

	for (const file of siblingFiles) {
		if (!IMAGE_EXTENSIONS.includes(file.extension.toLowerCase())) continue;
		if (pattern.test(file.basename)) {
			matches.push(file);
		}
	}

	// Natural sort: xxx-2 before xxx-10
	matches.sort((a, b) =>
		a.basename.localeCompare(b.basename, undefined, { numeric: true, sensitivity: "base" })
	);

	return matches;
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
