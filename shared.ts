import * as fs from "fs";
import path from "path";
import matter, { GrayMatterFile, Input } from "gray-matter";
import * as yaml from "json-to-pretty-yaml";
import { marked } from 'marked';
import {HtmlDiffer} from 'html-differ';
import simpleGit, { SimpleGit } from 'simple-git';
import recursive from "recursive-readdir";

export const CONTENT_ROOT = path.join(__dirname, 'content');
export const VERSIONS_DIR = 'versions';
const BUILD_DIR = path.join(__dirname, 'build');
const REMOTE_GIT_DIR = path.join(BUILD_DIR, 'rstreams-cloned-from-master');
const REMOTE_GIT_REPO_URL = 'https://github.com/LeoPlatform/rstreams.git';
const REMOTE_CONTENT_ROOT = path.join(REMOTE_GIT_DIR, 'content');


export type IsoDateString = string;
export type RenderSetting = 'always' // The page will be rendered to disk and get a RelPermalink etc.
                          | 'never'  // The page will not be included in any page collection.
                          | 'link';  // The page will be not be rendered to disk, but will get a RelPermalink.

export type ListSetting = 'always' // The page will be included in all page collections, e.g. site.RegularPages, $page.Pages.
                        | 'never'  // The page will not be included in any page collection.
                        | 'local'; // The page will be included in any local page collection, e.g. $page.RegularPages, $page.Pages. One use case for this would be to create fully navigable, but headless content sections.

export interface VersionFileUnsafe {
    relativeFilePath: string;
    localFilePath?: string;
    remoteFilePath?: string;
    localMatter?: FrontMatterFile<string>;
    remoteMatter?: FrontMatterFile<string>;
    diffFile?: string;
}

export interface VersionFile extends VersionFileUnsafe {
    relativeFilePath: string;
    localFilePath: string;
    remoteFilePath: string;
    localMatter: FrontMatterFile<string>;
    remoteMatter: FrontMatterFile<string>;
    diffFile: string;
}

export interface Version {
    // This doc's version
    version: number;

    // The current version number.  Versions start at 1.0 and only have two numbers.
    current: number;

    // Newest version is at the last element of the array, older versions are before it
    all: VersionObj[];

    // Used to generate version diff markdown files
    render: VersionRender;
}

export interface VersionRender {
    // The name of the file without language or extension to use to generate new diff files
    fileName: string;

    // The language code if any (en, fr, etc.)
    language?: string;
}

export interface VersionObj {
    version: number;
    date: IsoDateString;

    // If present, this version represents a collapse of multiple versions
    collapsed?: Collapsed;

    // Will usually be used during generation for bookkeeping and won't be stored
    // in the front matter itself.  In the case of a 
    // version that collapses multiple versions, this will be the commit hash of the last
    // version comprising the group
    commitHash?: string;

    // Will usually be used during generation for bookkeeping and won't be stored
    // in the front matter itself.  In the case of a 
    // version that collapses multiple versions, this will be the commit date of the last
    // version comprising the group
    commitDate?: IsoDateString;
}

/**
 * If a doc version represents multiple collapsed versions then this is the start/end commit/hash date
 * for the versions that this one version represents.
 */
 export interface Collapsed {
    startCommitHash: string;
    startCommitDate: IsoDateString;
    endCommitHash: string;
    endCommitDate: IsoDateString;
    numCommitsCollapsed: number;
}

/**
 * https://gohugo.io/content-management/front-matter/#front-matter-cascade
 */
export interface CascadeTarget {

    // A Glob pattern matching the content path below /content. Expects Unix-styled slashes. Note that this is the virtual path, so 
    // it starts at the mount root. The matching support double-asterisks so you can match for patterns like /blog/*/** to match 
    // anything from the third level and down.
    path?: string;

    // A Glob pattern matching the Page’s Kind(s), e.g. “{home,section}”.
    kind?: string;

    // A Glob pattern matching the Page’s language, e.g. “{en,sv}”.
    lang?: string;

    // A Glob pattern matching the build environment, e.g. “{production,development}”
    environment: string;
}

export interface Cascade extends FrontMatter {
    _target: CascadeTarget;
}

/**
 * https://gohugo.io/content-management/front-matter
 */
export interface FrontMatter {
    title?: string;
    description?: string;

    // the type of the content; this value will be automatically derived from the directory (i.e., the section) if not specified in front matter.
    // https://gohugo.io/content-management/sections/
    type?: string;

    // the layout Hugo should select from the lookup order when rendering the content. If a type is not specified in the front matter, Hugo will look
    // for the layout of the same name in the layout directory that corresponds with a content’s section. See Content Types.
    // https://gohugo.io/content-management/types/
    layout?: string;

    // used for ordering your content in lists. Lower weight gets higher precedence. So content with lower weight will come first. If set, weights
    // should be non-zero, as 0 is interpreted as an unset weight. https://gohugo.io/templates/lists/
    weight?: number;

    // if true, the content will not be rendered unless the --buildDrafts flag is passed to the hugo command.
    draft?: boolean;
    version: Version;
    date?: IsoDateString;
    _build?: {
        render?: RenderSetting
        list?: ListSetting
    }

    // a map of Front Matter keys whose values are passed down to the page’s descendants unless overwritten by 
    // self or a closer ancestor’s cascade. See Front Matter Cascade for details.
    cascade?: Cascade;

    // Old names for this page that will still work as redirects
    // https://gohugo.io/content-management/urls/#aliases
    aliases?: string[];
    audio?: string[];

    // The datetime at which the content should no longer be published by Hugo; expired content will not be
    // rendered unless the --buildExpired flag is passed to the hugo command.
    expiryDate? : IsoDateString;

    // if true, sets a leaf bundle to be headless. https://gohugo.io/content-management/page-bundles/#headless-bundle
    headless?: boolean;

    // an array of paths to images related to the page; used by internal templates such as _internal/twitter_cards.html.
    // https://gohugo.io/templates/internal
    images?: string[];

    // if true, Hugo will explicitly treat the content as a CJK language; both .Summary and .WordCount work properly in CJK languages.
    isCJKLanguage?: boolean;

    // the meta keywords for the content.    
    keywords?: string[];

    // the datetime at which the content was last modified.
    lastmod?: IsoDateString;

    // used for creating links to content; if set, Hugo defaults to using the linktitle before the title. Hugo can also order lists of content by linktitle.
    // https://gohugo.io/templates/lists/#by-link-title
    linkTitle?: string;

    // experimental, keep it markdown which is the default
    markup?: 'md' | 'rst';
    
    // allows you to specify output formats specific to the content. See output formats.
    // https://gohugo.io/templates/output-formats/
    outputs?: string[];

    // if in the future, content will not be rendered unless the --buildFuture flag is passed to hugo.
    publishDate?: IsoDateString;

    // used for configuring page bundle resources. See Page Resources.
    // https://gohugo.io/content-management/page-resources/
    resources?: string[];

    // an array of series this page belongs to, as a subset of the series taxonomy; used by the opengraph internal template to populate og:see_also.
    // https://gohugo.io/content-management/taxonomies/  https://gohugo.io/templates/internal
    series?: string[];

    // appears as the tail of the output URL. A value specified in front matter will override the segment of the URL based on the filename.
    slug?: string;

    // Don't use
    // text used when providing a summary of the article in the .Summary page variable; details available in the content-summaries section.
    // https://gohugo.io/content-management/summaries/
    summary?: string;

    // the full path to the content from the web root. It makes no assumptions about the path of the content file. See URL Management.
    // https://gohugo.io/content-management/urls/#set-url-in-front-matter
    url?: string;

    // an array of paths to videos related to the page; used by the opengraph internal template to populate og:video
    // https://gohugo.io/templates/internal
    videos?: string[];
}

export interface FrontMatterFile<I extends Input> extends GrayMatterFile<I> {
    data: FrontMatter;
}

/**
 * 
 * @param path Either fully qualified path to markdown file (the default) or relative to content dir.
 * @param isRelativeToContentDir If false, path is expected to be fully qualified.  If true, relative to project root
 *                               dir so this is valid: content/rstreams-flow/_index.en.md
 * @returns The markdown doc file with front matter.
 */
export function getFrontMatterFile(filePath: string, isRelativeToContentDir?: boolean): FrontMatterFile<string> {
    if (isRelativeToContentDir === true) {
        filePath = path.join(__dirname, filePath);
    }

    if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ${filePath}');
    }

    return matter(fs.readFileSync(filePath, 'utf8')) as FrontMatterFile<string>;
}

function stringifyFrontMatter(matter: GrayMatterFile<string>) {
    let s = '';

    s += '---\n';
    s += yaml.stringify(matter.data);
    s += '---\n';
    s += matter.content;

    return s;
}

export function getAllVersionFiles(docFilePath: string) {
    //TODO: REMOVE THE DIE ON THIS
    const versionsPath = path.join(__dirname, path.dirname(docFilePath), VERSIONS_DIR);
    const versionRender = getFileNameAndLanguageFromDocFile(docFilePath);

    return fs.readdirSync(versionsPath).filter(fileName => {
        console.log(fileName);
        const regex = new RegExp(`${versionRender.fileName}-\\d+?\\.\\d+?\\..*?\\.md`);
        return  !!regex.exec(fileName);
    }).map(fileName => path.join(versionsPath, fileName));
}

// (async () => {
//     getAllVersionFiles('content/rstreams-botmon/_index.en.md');
// })()

export function deleteAllVersionFiles(docFilePath: string) {
    const files = getAllVersionFiles(docFilePath);
    for (const file of files) {
        fs.unlinkSync(file);
    } 
}

export function getFileNameAndLanguageFromDocFile(docFilePath: string): VersionRender {
    const baseName = path.basename(docFilePath);
    const regex = /(.+?)(?:\.([a-z][a-z]))?\.md/g;
    const match = regex.exec(baseName);
    const result: VersionRender = {fileName: '', language: undefined};
    
    if (match) {
        result.fileName = match[1];
        result.language = match.length === 3 ? match[2] : undefined;
    }
    
    if (!result.fileName) {
        throw new Error(`Failed to get fileName from ${docFilePath}`);
    }
    
    return result;
}

/**
 * Return true if when we convert the local and remote markdown files to HTML
 * they are the same, ignoring whitespace in the HTML.
 * 
 * @param file 
 * @returns 
 */
 export function htmlGeneratedFromMarkdownIsSameBetweenLocalAndRemote(file: VersionFile): boolean {
    const local = marked.parser(marked.lexer(file.localMatter.content));
    const remote = marked.parser(marked.lexer(file.remoteMatter.content));
    const htmlDiffer = new HtmlDiffer();

    const isEqual = htmlDiffer.isEqual(local, remote);

    if (!isEqual) {
        console.log('Local vs. remote different:' + file.relativeFilePath);
    }

    return isEqual;
}

/**
 * Reset build directory and clone the remote repo of this very project so we can diff it later.
 */
 export async function initBuild() {
    // Delete the build directory and re-create it
    if (fs.existsSync(BUILD_DIR)){
        fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(BUILD_DIR);

    const git: SimpleGit = simpleGit({
        baseDir: BUILD_DIR
    });

    await git.clone(REMOTE_GIT_REPO_URL, REMOTE_GIT_DIR);	
}

/**
 * Return the relative path of a file, whether it is in the build directory
 * coming from the remote git repo or just a local path to what is checked out here.
 * @param path 
 * @param local 
 */
 export function getRelativeFilePath(path: string, local: boolean): string {
    const BASE_PATH = local ? CONTENT_ROOT : REMOTE_CONTENT_ROOT;
    const idx = path.indexOf(BASE_PATH) + BASE_PATH.length;
    return path.substring(idx);
}

/**
 * Ignore anything not a .md file
 * @param file 
 * @param stats 
 * @returns 
 */
function ignoreFiles(file: string, stats: fs.Stats) {
    return stats.isFile() && !file.endsWith('md') || (stats.isDirectory() && file === VERSIONS_DIR);
}

/**
 * 
 * @param path 
 * @returns All markdown content files in the given directory and all subdirectories.
 */
async function getDocs(path: string) {
    return await recursive(path, [ignoreFiles]);
}

/**
 * @returns All markdown content files in the local directory that may contain changes not yet
 * committed.
 */
 export async function getAllLocalContentFiles(): Promise<string[]> {
    return await getDocs(CONTENT_ROOT);
}

/**
 * @returns All markdown content files in the directory we cloned from this very project from 
 * into the build directory.  It will have content already checked in but not the content
 * about to be checked in so we can compare and see what changed.
 */
export async function getAllRemoteContentFiles(): Promise<string[]> {
    return await getDocs(REMOTE_CONTENT_ROOT);
}

export function saveDoc(path: string, fileMatter: FrontMatterFile<string>, files: string[]) {
    const fileContent = stringifyFrontMatter(fileMatter);
    fs.writeFileSync(path, fileContent);
    if (files) {files.push(path);}
}

export async function writeFilesChanged(filesChanged: string[]) {
    if (filesChanged.length === 0) {return;}

    // Be sure the last line has a newline after it
    let fileContent = '';
    for (const file of filesChanged) {
        fileContent += file + '\n';
    }

    fs.writeFileSync(CHANGED_FILES_PATH, fileContent);
}


//TODO: was doing this in versions.ts as the last thing in the main method.  Don't think we need it
// await writeFilesChanged();
// const CHANGED_FILES_PATH = path.join(BUILD_DIR, 'files-changed-by-version-script.txt');
// async function writeFilesChanged() {
//     if (filesChanged.length === 0) {return;}

//     // Be sure the last line has a newline after it
//     let fileContent = '';
//     for (const file of filesChanged) {
//         fileContent += file + '\n';
//     }

//     fs.writeFileSync(CHANGED_FILES_PATH, fileContent);
// }