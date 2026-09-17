import {App, TFile} from "obsidian";
import OpenAI from "openai";
import {Agent, OpenAIProvider, Runner} from "@openai/agents";
import type { AgentInputItem } from "@openai/agents";
import type {Pic2NoteSettings} from "../settings";
import { cleanMarkdown } from "./createNote";
import { getImageDataUrl } from "./buildImageData";
import { requestUrlFetch } from "./fetchHandler"


export async function generateMarkdownFromImage(app: App, imageFile: TFile, settings: Pic2NoteSettings): Promise<string> {
	return generateMarkdownFromImages(app, [imageFile], settings);
}

export async function generateMarkdownFromImages(app: App, imageFiles: TFile[], settings: Pic2NoteSettings): Promise<string> {
	const baseURL = settings.baseUrl.trim() || undefined;
	const openAIClient = new OpenAI({
		apiKey: settings.openaiApiKey.trim() || "local",
		baseURL,
		dangerouslyAllowBrowser: true,
		fetch: requestUrlFetch,
	});

	const runner = new Runner({
		modelProvider: new OpenAIProvider({
			openAIClient,
			useResponses: baseURL ? false : undefined,
		}),
		tracingDisabled: true,
		traceIncludeSensitiveData: false,
		workflowName: "Obsidian image note generation",
	});

	// Step 1: Process each image individually
	const individualResults: string[] = [];
	for (const imageFile of imageFiles) {
		const agent = new Agent({
			name: "Obsidian image note writer",
			model: settings.model,
			instructions: [
				"你是一个 Obsidian Markdown 笔记整理助手。",
				"根据用户提供的图片内容，创建一篇结构清晰的中文 Markdown 笔记。",
				"请基于可见内容总结，不要编造细节。",
			].join("\n"),
		});

		const result = await runner.run(agent, await buildSingleImageInput(app, imageFile), {
			maxTurns: 1,
		});

		const markdown = cleanMarkdown(String(result.finalOutput ?? ""));
		if (markdown) {
			individualResults.push(markdown);
		}
	}

	if (individualResults.length === 0) {
		throw new Error("The model did not return Markdown content for any image.");
	}

	// Step 2: If only one image, return directly
	if (individualResults.length === 1) {
		return individualResults[0] ?? "";
	}

	// Step 3: Consolidate multiple results into one note
	const consolidationAgent = new Agent({
		name: "Obsidian note consolidator",
		model: settings.model,
		instructions: [
			"你是一个 Obsidian Markdown 笔记整理助手。",
			"用户提供了多段来自连续图片的 Markdown 笔记内容。",
			"请将这些内容综合整理为一篇结构清晰、连贯的中文 Markdown 笔记。",
			"去除重复内容，保持逻辑连贯，不要编造细节。",
		].join("\n"),
	});

	const consolidationResult = await runner.run(
		consolidationAgent,
		buildConsolidationInput(individualResults),
		{ maxTurns: 1 }
	);

	const finalMarkdown = cleanMarkdown(String(consolidationResult.finalOutput ?? ""));
	if (!finalMarkdown) {
		throw new Error("The model did not return consolidated Markdown content.");
	}

	return finalMarkdown;
}

async function buildSingleImageInput(app: App, imageFile: TFile): Promise<AgentInputItem[]> {
	const dataUrl = await getImageDataUrl(app, imageFile);

	return [{
		role: "user",
		content: [
			{
				type: "input_text",
				text: "请将图片内容整理为 Markdown 笔记。",
			},
			{
				type: "input_image",
				image: dataUrl,
				detail: "high",
			},
		],
	}];
}

function buildConsolidationInput(results: string[]): AgentInputItem[] {
	const combinedContent = results
		.map((r, i) => `## 图片 ${i + 1}\n${r}`)
		.join("\n\n---\n\n");

	return [{
		role: "user",
		content: [
			{
				type: "input_text",
				text: `以下是从多张连续图片中提取的笔记内容，请将它们综合整理为一篇结构清晰、连贯的 Markdown 笔记：\n\n${combinedContent}`,
			},
		],
	}];
}

