import path from "path";
import recursive from "recursive-readdir";
import * as fs from "fs";
import matter, { GrayMatterFile } from "gray-matter";
import * as yaml from "json-to-pretty-yaml";

const CONTENT_ROOT = path.join(__dirname, "content");

async function main() {
    await initDocs();
}

let idx = 0;

/**
 * Go through and init and doc versions not set to 1.0
 */
async function initDocs() {
    const docs = await getDocs();
	const now = (new Date()).toISOString();
	for (const doc of docs) {
		let changed = false;
		const fileMatter = matter(fs.readFileSync(doc, 'utf8'))

		// If there's no version number, set the version number and reset the date
		if (!fileMatter.data.version) {
			fileMatter.data.version = '1.0';
			fileMatter.data.date = now;
			changed = true;
		}

		if (changed) {
			const fileContent = stringifyFrontMatter(fileMatter);
			fs.writeFileSync(doc, fileContent);
		}
	}
}

function stringifyFrontMatter(matter: GrayMatterFile<string>) {
	let s = '';

	s += '---\n';
	s += yaml.stringify(matter.data);
	s += '---\n';
	s += matter.content;

	return s;
}

async function getDocs() {
    return await recursive(CONTENT_ROOT, [ignoreFiles]);
}


/**
 * Ignore anything not a .md file
 * @param file 
 * @param stats 
 * @returns 
 */
function ignoreFiles(file: string, stats: fs.Stats) {
    return stats.isFile() && !file.endsWith('md');
}

(async () => {
    await main();
})()