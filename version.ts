import path from "path";
import recursive from "recursive-readdir";
import * as fs from "fs";
import matter, { GrayMatterFile, Input } from "gray-matter";
import * as yaml from "json-to-pretty-yaml";
import simpleGit, { SimpleGit } from 'simple-git';
import { marked } from 'marked';
import {HtmlDiffer} from 'html-differ';

const CONTENT_ROOT = path.join(__dirname, 'content');
const BUILD_DIR = path.join(__dirname, 'build');
const REMOTE_GIT_REPO_URL = 'https://github.com/LeoPlatform/rstreams.git';
const REMOTE_GIT_DIR = path.join(BUILD_DIR, 'rstreams-cloned-from-master');
const REMOTE_CONTENT_ROOT = path.join(REMOTE_GIT_DIR, 'content');
const VERSIONS_DIR = 'versions';

/**
  * Other types are at bottom of the file.
  */
interface VersionFile {
    relativeFilePath: string;
    localFilePath?: string;
    remoteFilePath?: string;
    localMatter?: FrontMatterFile<string>;
    remoteMatter?: FrontMatterFile<string>;
    diffFile?: string;
}

async function main() {
    const now = (new Date()).toISOString();
    await initDocs(now);
    //await generateVersions(now);
}

async function generateVersions(now: IsoDateString) {
    await initBuild();
    await getVersions(now);
}

async function getVersions(now: IsoDateString): Promise<VersionFile[]> {
    const LOCAL_FILES = await getDocs(CONTENT_ROOT);
    const REMOTE_FILES = await getDocs(REMOTE_CONTENT_ROOT);
    const versions: {[key : string]: VersionFile} = {};
    const result: VersionFile[] = [];

    for (const file of LOCAL_FILES) {
        const relativePath = getRelativeFilePath(file, true);
        let versionFile = versions[relativePath];
        if (!versionFile) {
            versionFile = {relativeFilePath: relativePath, localFilePath: file};
            versions[relativePath] = versionFile;
        } else { /* do nothing */}
    }

    for (const file of REMOTE_FILES) {
        const relativePath = getRelativeFilePath(file, false);
        let versionFile = versions[relativePath];
        if (!versionFile) {
            versionFile = {relativeFilePath: relativePath, remoteFilePath: file};
        } else {
            versionFile.remoteFilePath = file;
        }

        /**
         * interface Version {
    // The current version number.  Versions start at 1.0 and only have two numbers.
    current: string;

    // Newest version is at the last element of the array, older versions are before it
    all: VersionObj[];

    // Used to generate version diff markdown files
    _render: {
        fileName: string;
        language: string;
    }
}
         */

        // If we've got both a local and remote file, we will need to compare versions
        if (versionFile.localFilePath && versionFile.remoteFilePath) {
            versionFile.localMatter = matter(fs.readFileSync(versionFile.localFilePath, 'utf8'));
            versionFile.remoteMatter = matter(fs.readFileSync(versionFile.remoteFilePath, 'utf8'));
            if (!compareFiles(versionFile)) {
                // They are different.  Create a new version.
                const localVersion: Version = versionFile.localMatter.data.version;
                const remoteVersion: Version = versionFile.remoteMatter.data.version;

                const oldVerNum = remoteVersion.current || '1.0';
                let newVerNum: string;
                let genVer = false;

                if (localVersion.current === oldVerNum) {
                    // Normal case, just increment the local version.
                    newVerNum = (parseFloat(oldVerNum) + .1) + '';
                    localVersion.current = newVerNum;
                    localVersion.all.push({version: newVerNum, date: now})
                    genVer = true;
                } else if (localVersion.current > oldVerNum) {
                    // The local version is already newer than the previous change, just use it
                    // And overwrite the diff markdown file if there is one.
                    newVerNum = localVersion.current;
                    genVer = true;
                } else {
                    // The remote version is newer.  Act like this change didn't happen
                    // and just update the local version to the current remote version but don't create
                    // a new version doc for it.
                    localVersion.current = remoteVersion.current;
                }

                // Save the local version since one way or another, we changed the front matter
                //xxx

                if (genVer) {
                    // Make sure the versions subdirectory exists
                    const versionsPath = path.join(path.dirname(versionFile.localFilePath), VERSIONS_DIR);
                    if (!fs.existsSync(versionsPath)) {
                        fs.mkdirSync(versionsPath);
                    } else {/* Directory already exists */}
                }
            }
        } else { /* It's either a deleted or newly inserted file, nothing to do. */}
    }

    return result;
}

function compareFiles(file: VersionFile): boolean {
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
 * Return the relative path of a file, whether it is in the build directory
 * coming from the remote git repo or just a local path to what is checked out here.
 * @param path 
 * @param local 
 */
function getRelativeFilePath(path: string, local: boolean): string {
    const BASE_PATH = local ? CONTENT_ROOT : REMOTE_CONTENT_ROOT;
    const idx = path.indexOf(BASE_PATH) + BASE_PATH.length;
    return path.substring(idx);
}

/**
 * Reset build directory and clone the remote repo of this very project so we can diff it later.
 */
async function initBuild() {
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
 * Go through and init any doc versions not set to 1.0, setting the date to now for those docs
 */
async function initDocs(now: IsoDateString) {
    const docs = await getDocs(CONTENT_ROOT);
    for (const doc of docs) {
        let changed = false;
        const fileMatter = matter(fs.readFileSync(doc, 'utf8')) as FrontMatterFile<string>;

        // If there's no version number, set the version number and reset the date
        if (!fileMatter.data.version) {
            fileMatter.data.version = {
                current: '1.0',
                all: [{version: '1.0', date: now}],
                _render: generateVersionRenderData(doc, fileMatter.data)
            }
            fileMatter.data.date = now;
            changed = true;
        }

        if (changed) {
            const fileContent = stringifyFrontMatter(fileMatter);
            fs.writeFileSync(doc, fileContent);
        }
    }
}

function generateVersionRenderData(localFilePath: string, frontMatter: FrontMatter, force?: boolean): VersionRender | undefined {
    let result = frontMatter.version && frontMatter.version._render ? frontMatter.version._render : undefined;
    // The file name to use, if in the front matter, get it, and if not set it.
    let fileName = result && result.fileName;
    
    if (!fileName || force === true) {
        const baseName = path.basename(localFilePath);
        const regex = /(.+?)(?:\.([a-z][a-z]))?\.md/g;
        const match = regex.exec(baseName);
        let language: string | undefined;

        if (match) {
            fileName = match[1];
            language = match.length === 3 ? match[2] : undefined;
        }
        
        if (fileName) {
            result = {
                fileName: fileName,
                language: language 
            };
        } else {/* nothing can be done, shouldn't happen */}
    } else {/* we've got a fileName already */}

    return result;
}

function stringifyFrontMatter(matter: GrayMatterFile<string>) {
    let s = '';

    s += '---\n';
    s += yaml.stringify(matter.data);
    s += '---\n';
    s += matter.content;

    return s;
}

async function getDocs(path: string) {
    return await recursive(path, [ignoreFiles]);
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

type IsoDateString = string;
type RenderSetting = 'always' // The page will be rendered to disk and get a RelPermalink etc.
                   | 'never'  // The page will not be included in any page collection.
                   | 'link';  // The page will be not be rendered to disk, but will get a RelPermalink.

type ListSetting = 'always' // The page will be included in all page collections, e.g. site.RegularPages, $page.Pages.
                 | 'never'  // The page will not be included in any page collection.
                 | 'local'; // The page will be included in any local page collection, e.g. $page.RegularPages, $page.Pages. One use case for this would be to create fully navigable, but headless content sections.

interface Version {
    // The current version number.  Versions start at 1.0 and only have two numbers.
    current: string;

    // Newest version is at the last element of the array, older versions are before it
    all: VersionObj[];

    // Used to generate version diff markdown files
    _render: VersionRender;
}

interface VersionRender {
    // The name of the file without language or extension to use to generate new diff files
    fileName: string;

    // The language code if any (en, fr, etc.)
    language?: string;
}

interface VersionObj {
    version: string;
    date: IsoDateString;
}

/**
 * https://gohugo.io/content-management/front-matter/#front-matter-cascade
 */
 interface CascadeTarget {

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

interface Cascade extends FrontMatter {
    _target: CascadeTarget;
}

/**
 * https://gohugo.io/content-management/front-matter
 */
interface FrontMatter {
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
    version?: Version;
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

interface FrontMatterFile<I extends Input> extends GrayMatterFile<I> {
    data: FrontMatter;
}