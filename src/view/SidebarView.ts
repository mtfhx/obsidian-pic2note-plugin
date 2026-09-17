import { ItemView, TFile, WorkspaceLeaf, Notice, ButtonComponent, MarkdownRenderer, setIcon } from "obsidian";
import QuarkOcrPlugin from "../main";
import { generateMarkdownFromImage } from "../app/pic2Note";
import { createMarkdownNote } from "../app/createNote";

export const VIEW_TYPE_OCR_SIDEBAR = "quark-ocr-sidebar-view";

type OcrState = "ready" | "processing" | "success" | "error";

export class SidebarView extends ItemView {
	private plugin: QuarkOcrPlugin;
	private currentImage: TFile | null = null;
	private currentResult: string = "";
	private resultContent: HTMLElement;
	private statusEl: HTMLElement;
	private statusTextEl: HTMLElement;
	private fileNameEl: HTMLElement;
	private fileSizeEl: HTMLElement;
	private submitButton: ButtonComponent;
	private copyButton: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: QuarkOcrPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_OCR_SIDEBAR;
	}

	getDisplayText(): string {
		if (this.currentImage) {
			return `OCR: ${this.currentImage.name}`;
		}
		return "Image recognition";
	}

	getIcon(): string {
		return "scan-text";
	}

	async onOpen(): Promise<void> {
		this.containerEl.empty();
		this.containerEl.addClass("quark-ocr-sidebar");

		// Header Section
		const header = this.containerEl.createDiv({ cls: "quark-ocr-header" });
		const headerTitle = header.createDiv({ cls: "quark-ocr-header-title" });
		const iconEl = headerTitle.createSpan({ cls: "quark-ocr-icon" });
		setIcon(iconEl, "scan-text");
		headerTitle.createSpan({ cls: "quark-ocr-title-text", text: "Image recognition" });

		const fileInfo = header.createDiv({ cls: "quark-ocr-file-info" });
		this.fileNameEl = fileInfo.createSpan({ cls: "quark-ocr-file-name", text: "No image selected" });
		this.fileSizeEl = fileInfo.createSpan({ cls: "quark-ocr-file-size", text: "" });

		// Status Indicator
		this.statusEl = this.containerEl.createDiv({ cls: "quark-ocr-status", attr: { "data-state": "ready" } });
		this.statusEl.createSpan({ cls: "quark-ocr-status-dot" });
		this.statusTextEl = this.statusEl.createSpan({ cls: "quark-ocr-status-text", text: "Ready to generate" });

		// Result Section
		const resultSection = this.containerEl.createDiv({ cls: "quark-ocr-result-section" });
		const resultHeader = resultSection.createDiv({ cls: "quark-ocr-result-header" });
		resultHeader.createSpan({ text: "Result" });
		this.copyButton = resultHeader.createEl("button", { cls: "quark-ocr-copy-btn", attr: { "aria-label": "Copy result" } });
		setIcon(this.copyButton, "copy");
		this.copyButton.addEventListener("click", () => this.handleCopy());

		this.resultContent = resultSection.createDiv({ cls: "quark-ocr-result-content" });
		this.resultContent.createEl("p", { cls: "quark-ocr-placeholder", text: "Select an image to start" });

		// Footer
		const footer = this.containerEl.createDiv({ cls: "quark-ocr-footer" });
		this.submitButton = new ButtonComponent(footer)
			.setButtonText("Generate note")
			.setCta()
			.onClick(() => {
				void this.handleSubmit();
			});
		this.submitButton.buttonEl.addClass("quark-ocr-submit");
		this.submitButton.setDisabled(true);
	}

	private setStatus(state: OcrState, text: string): void {
		this.statusEl.setAttribute("data-state", state);
		this.statusTextEl.setText(text);
	}

	setImage(file: TFile): void {
		this.currentImage = file;
		this.currentResult = "";
		this.clearResult();

		this.fileNameEl.setText(file.name);
		this.fileSizeEl.setText(this.formatFileSize(file.stat.size));
		this.submitButton.setDisabled(false);
		this.setStatus("ready", "Ready to generate");
		this.copyButton.setAttribute("data-copied", "false");
	}

	private formatFileSize(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		}
		if (bytes < 1024 * 1024) {
			return `${Math.round(bytes / 1024)} KB`;
		}
		return `${Math.round(bytes / (1024 * 1024))} MB`;
	}

	clearResult(): void {
		this.resultContent.empty();
		this.resultContent.createEl("p", { cls: "quark-ocr-placeholder", text: "Click generate note to start" });
	}

	async setResult(text: string): Promise<void> {
		this.currentResult = text;
		this.resultContent.empty();
		if (text.trim().length === 0) {
			this.resultContent.createEl("p", { cls: "quark-ocr-placeholder", text: "No text recognized" });
			return;
		}
		await MarkdownRenderer.render(this.app, text, this.resultContent, "", this);
	}

	private handleCopy(): void {
		if (this.currentResult.trim().length === 0) {
			new Notice("No result to copy");
			return;
		}
		void navigator.clipboard.writeText(this.currentResult);
		this.copyButton.setAttribute("data-copied", "true");
		new Notice("Result copied");
		setTimeout(() => {
			this.copyButton.setAttribute("data-copied", "false");
		}, 2000);
	}

	private async handleSubmit(): Promise<void> {
		if (!this.currentImage) {
			new Notice("No image selected");
			return;
		}

		if (!this.plugin.settings.openaiApiKey) {
			new Notice("Please configure API key in settings");
			return;
		}

		this.submitButton.setDisabled(true);
		this.submitButton.setButtonText("Processing...");
		this.setStatus("processing", "Recognizing...");
		this.resultContent.empty();
		this.resultContent.createEl("p", { cls: "quark-ocr-placeholder", text: "Processing..." });

		try {
			// Step 1: Generate note using imageNote with OCR reference
			this.setStatus("processing", "Generating note...");
			const markdown = await generateMarkdownFromImage(
				this.app,
				this.currentImage,
				this.plugin.settings,
			);

			this.setStatus("success", "Note generated");
			new Notice("Note generated successfully");

			// Step 2 Create a sibling Markdown note
			this.setStatus("processing", "Creating note...");
			const noteFile = await createMarkdownNote(this.app, this.currentImage, markdown);
			await this.setResult(markdown);

			this.setStatus("success", "Note created");
			new Notice(`Note created: ${noteFile.path}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.resultContent.empty();
			this.resultContent.createEl("p", { cls: "quark-ocr-placeholder", text: `Error: ${message}` });
			this.setStatus("error", "Generation failed");
			new Notice(`Generation failed: ${message}`);
		} finally {
			this.submitButton.setDisabled(false);
			this.submitButton.setButtonText("Generate note");
		}
	}

	async onClose(): Promise<void> {
		this.containerEl.empty();
	}
}
