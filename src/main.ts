import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, Pic2NoteSettingTab, Pic2NoteSettings } from "./settings";
import { registerView } from "./registerView";

export default class Pic2NotePlugin extends Plugin {
	settings: Pic2NoteSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		registerView(this);
		this.addSettingTab(new Pic2NoteSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<Pic2NoteSettings>);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
