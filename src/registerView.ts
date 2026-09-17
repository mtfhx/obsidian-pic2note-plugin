import { TFile, WorkspaceLeaf, Notice, Menu, TAbstractFile } from "obsidian";
import Pic2NotePlugin from "./main";
import { SidebarView, VIEW_TYPE_OCR_SIDEBAR } from "./view/SidebarView";
import { findSimilarImages } from "./app/findSimilarImages";
import { generateMarkdownFromImages } from "./app/pic2Note";
import { createMarkdownNote } from "./app/createNote";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];
const MAX_IMAGES = 5;

function isImageFile(file: TFile): boolean {
	const ext = file.extension.toLowerCase();
	return IMAGE_EXTENSIONS.includes(ext);
}

export function registerView(plugin: Pic2NotePlugin): void {
	// Register the view
	plugin.registerView(VIEW_TYPE_OCR_SIDEBAR, (leaf: WorkspaceLeaf) => new SidebarView(leaf, plugin));

	// // Listen to file-open events
	// plugin.registerEvent(
	// 	plugin.app.workspace.on("file-open", (file: TFile | null) => {
	// 		if (file && isImageFile(file)) {
	// 			void openOcrSidebar(plugin, file);
	// 		}
	// 	})
	// );

	// Add command to manually open the sidebar
	plugin.addCommand({
		id: "open-ocr-sidebar",
		name: "Open ocr sidebar for current image",
		checkCallback: (checking: boolean) => {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (activeFile && isImageFile(activeFile)) {
				if (!checking) {
					void openOcrSidebar(plugin, activeFile);
				}
				return true;
			}
			return false;
		}
	});

	// Add right-click menu for image files
	plugin.registerEvent(
		plugin.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => {
			if (file instanceof TFile && isImageFile(file)) {
				menu.addItem((item) => {
					item.setTitle("Generate note")
						.setIcon("file-plus")
						.setSection("action")
						.onClick(() => {
							void handleGenerateNote(plugin, file);
						});
				});
			}
		})
	);
}

async function openOcrSidebar(plugin: Pic2NotePlugin, imageFile: TFile): Promise<void> {
	const workspace = plugin.app.workspace;

	// Find existing sidebar leaf or create new one
	let leaf: WorkspaceLeaf | null = null;
	const leaves = workspace.getLeavesOfType(VIEW_TYPE_OCR_SIDEBAR);

	if (leaves.length > 0) {
		leaf = leaves[0] ?? null;
	} else {
		leaf = workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_OCR_SIDEBAR, active: true });
		}
	}

	if (leaf) {
		void workspace.revealLeaf(leaf);
		const view = leaf.view;
		if (view instanceof SidebarView) {
			view.setImage(imageFile);
		}
	}
}

async function handleGenerateNote(plugin: Pic2NotePlugin, imageFile: TFile): Promise<void> {
	if (!plugin.settings.openaiApiKey) {
		new Notice("Please configure API key in settings");
		return;
	}

	// Find similar images in the same directory
	const parentFolder = imageFile.parent;
	const siblingFiles = parentFolder
		? parentFolder.children.filter((f): f is TFile => f instanceof TFile)
		: [];
	let imageFiles = findSimilarImages(siblingFiles, imageFile);

	// Enforce image limit
	if (imageFiles.length > MAX_IMAGES) {
		new Notice(`Too many images (${imageFiles.length}), limiting to ${MAX_IMAGES}`);
		imageFiles = imageFiles.slice(0, MAX_IMAGES);
	}

	const count = imageFiles.length;
	new Notice(`Generating note from ${count} image${count > 1 ? "s" : ""}...`);

	try {
		const markdown = await generateMarkdownFromImages(
			plugin.app,
			imageFiles,
			plugin.settings,
		);

		const noteFile = await createMarkdownNote(plugin.app, imageFile, markdown);
		new Notice(`Note created: ${noteFile.path}`);

		// Open files: note on left, images on right
		const workspace = plugin.app.workspace;
		const noteLeaf = workspace.getLeaf(false);
		await noteLeaf.openFile(noteFile);

		for (const imgFile of imageFiles) {
			const imageLeaf = workspace.getLeaf("split", "vertical");
			await imageLeaf.openFile(imgFile);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Generation failed: ${message}`);
	}
}