import { App, PluginSettingTab, Setting } from "obsidian";
import Pic2NotePlugin from "./main";

export interface Pic2NoteSettings {
	openaiApiKey: string;
	baseUrl: string;
	model: string;
}

export const DEFAULT_SETTINGS: Pic2NoteSettings = {
	openaiApiKey: "pic2note",
	baseUrl: "http://localhost:11434/api",
	model: "deepseek-ocr",
};

export class Pic2NoteSettingTab extends PluginSettingTab {
	plugin: Pic2NotePlugin;

	constructor(app: App, plugin: Pic2NotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Image note")
			.setHeading();

		new Setting(containerEl)
			.setName("Credentials")
			.setDesc("Used to call the default service or a compatible local service.")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("Secret key")
					.setValue(this.plugin.settings.openaiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openaiApiKey = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Base endpoint")
			.setDesc("Leave empty for the default endpoint, or set a compatible local endpoint.")
			.addText((text) =>
				text
					.setPlaceholder("Local endpoint")
					.setValue(this.plugin.settings.baseUrl)
					.onChange(async (value) => {
						this.plugin.settings.baseUrl = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Model")
			.setDesc("The model must support image input.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.model)
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value.trim() || DEFAULT_SETTINGS.model;
						await this.plugin.saveSettings();
					}),
			);
	}
}
