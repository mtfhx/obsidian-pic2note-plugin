# Image2Note

Right-click an image file in Obsidian and generate a same-name Markdown note with the OpenAI Agents SDK.

## Features

- Adds **Generate image note** to the right-click menu for image files.
- Converts files such as `xxx.jpeg` and `xxx.png` into `xxx.md`.
- Saves the generated note in the same folder as the image.
- Stops without overwriting when a same-name note already exists.

## Settings

Open **Settings → Community plugins → Image Note** and configure:

- **Credentials**: An OpenAI API key or a key accepted by your OpenAI-compatible server.
- **Base URL**: Leave empty for OpenAI, or set a local OpenAI-compatible endpoint such as `http://localhost:1234/v1`.
- **Model**: A vision-capable model, for example `gpt-5.4-mini` or `qwen2.5-vl-7b-instruct`.

## Local model example

Use an OpenAI-compatible local server with settings like:

```text
Base URL: http://localhost:1234/v1
Model: qwen2.5-vl-7b-instruct
```

## Privacy

The plugin does not collect telemetry. When you select **Generate image note**, the selected image is sent to the configured OpenAI-compatible API endpoint to generate Markdown. Credentials are stored in this plugin's Obsidian data.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
