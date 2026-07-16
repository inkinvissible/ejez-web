import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import TurndownService from "turndown";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, "..", ".site");

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced"
});

// Strip out scripts and styles completely
turndownService.remove(['script', 'style', 'noscript']);

async function generateMarkdown(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await generateMarkdown(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      try {
        const html = await fs.readFile(fullPath, 'utf8');
        const markdown = turndownService.turndown(html);
        const mdPath = fullPath.replace(/\.html$/, '.md');
        await fs.writeFile(mdPath, markdown, 'utf8');
      } catch (err) {
        console.error(`Failed to convert ${fullPath}:`, err);
      }
    }
  }
}

async function run() {
  console.log("Generating Markdown versions for agents...");
  await generateMarkdown(outputDir);
  console.log("Markdown generation complete.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
