# Japanese Reset

A mobile-first Japanese learning record app for turning ChatGPT voice practice into a reusable personal learning library.

## Workflow

1. Finish a Japanese voice practice session in ChatGPT.
2. Open **我的 → 复制 ChatGPT 日报提示词**.
3. Send the prompt to ChatGPT after the practice session.
4. Copy the returned JSON.
5. Import it into Japanese Reset.

The app organizes each report into:

- learning overview and speaking metrics
- personal vocabulary
- natural sentence patterns
- real corrections from the conversation
- session reflection and next steps
- a lightweight vocabulary review queue

All records are stored locally in the browser with `localStorage`.

## Run locally

Open `index.html`, or serve the folder with any static web server.
