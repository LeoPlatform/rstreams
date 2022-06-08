import path from "path";
import * as fs from "fs";
import { markdownDiff } from 'markdown-diff';
import { CONTENT_ROOT, FrontMatter, FrontMatterFile, getAllLocalContentFiles, getAllRemoteContentFiles, getFileNameAndLanguageFromDocFile, 
         getFrontMatterFile, getRelativeFilePath, htmlGeneratedFromMarkdownIsSameBetweenLocalAndRemote, initBuild, IsoDateString, saveDoc, Version, VersionFile, 
         VersionFileUnsafe, VersionObj, VersionRender, VERSIONS_DIR, writeFilesChanged } from "./shared";

// 
const filesChanged: string[] = [];

async function main() {
    const now = (new Date()).toISOString();
    await initDocs(now);
    await generateVersions(now);
    await writeFilesChanged(filesChanged);
}

async function generateVersions(now: IsoDateString) {
    await initBuild();
    await detectAndHandleNewDocVersions(now);
}

async function detectAndHandleNewDocVersions(now: IsoDateString) {
    const LOCAL_FILES = await getAllLocalContentFiles();
    const REMOTE_FILES = await getAllRemoteContentFiles();
    const versions: {[key : string]: VersionFileUnsafe} = {};

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

        // If we've got both a local and remote file, we will need to compare versions
        if (versionFile.localFilePath && versionFile.remoteFilePath) {
            versionFile.localMatter = getFrontMatterFile(versionFile.localFilePath);
            versionFile.remoteMatter = getFrontMatterFile(versionFile.remoteFilePath);
            if (!htmlGeneratedFromMarkdownIsSameBetweenLocalAndRemote(versionFile as VersionFile)) {
                // They are different.  Create a new version.
                adjustVersion(versionFile as VersionFile, now);
            }
        } else { /* It's either a deleted or newly inserted file, nothing to do. */}
    }
}

/**
 * The local and remote files when converted from markdown to HTML were different.
 * Let's adjust the version and generate the diff file for the version.
 */
function adjustVersion(versionFile: VersionFile, now: IsoDateString) {
    const localVersion: Version = versionFile.localMatter.data.version;
    const remoteVersion: Version = versionFile.remoteMatter.data.version;

    const oldVerNum = remoteVersion && remoteVersion.current ? remoteVersion.current : 1;
    let newVerNum: number;
    let genVer = false;

    if (localVersion.current === oldVerNum) {
        // Normal case, just increment the local version.
        newVerNum = oldVerNum + 1;
        
        localVersion.current = newVerNum;
        localVersion.version = newVerNum;
        localVersion.all.push({version: newVerNum, date: now})
        versionFile.localMatter.data.date = now;
        genVer = true;
    } else if (localVersion.current > oldVerNum) {
        // Assume we should simply re-generate the file and change dates and that everything else is as it should be.
        // This case will be hit if this is run multiple times before committing.
        versionFile.localMatter.data.date = now;
        localVersion.all[localVersion.all.length - 1].date = now;
        genVer = true;
    } else {
        // The remote version is newer.  This should never happen.  Throw an exception.
        throw new Error(`Remote version ${oldVerNum} is greater than local version ${localVersion.current} for ${versionFile.localFilePath}`);
    }

    // Save the local version since one way or another, we changed the front matter
    saveDoc(versionFile.localFilePath, versionFile.localMatter, filesChanged);

    console.log('Adjusting version front matter: ' + versionFile.localFilePath);

    // If we're supposed to generate version diff markdown file, do so
    if (genVer) {
        // Make sure the versions subdirectory exists
        const versionsPath = path.join(path.dirname(versionFile.localFilePath), VERSIONS_DIR);
        if (!fs.existsSync(versionsPath)) {
            fs.mkdirSync(versionsPath);
        } else {/* Directory already exists */}

        // Generate the new diff markdown file for the current version
        const newDiffVersionDocContent =  getMarkdownDiffContent(versionFile.remoteMatter.content, versionFile.localMatter.content);
        const prevVersionObj: VersionObj = getPreviousVersion(localVersion, versionFile.localFilePath);
        const newDiffVersionDocFileName = getDiffVersionDocFileName(localVersion, prevVersionObj);
        const newDiffVersionDocPath = path.join(versionsPath, newDiffVersionDocFileName);
        const newVersionFile = Object.assign({}, versionFile.localMatter) as FrontMatterFile<string>;

        // We want the markdown rendered to HTML, but we don't want it to show up in navigation
        newVersionFile.data._build = {render: 'always', list: 'never'};
        newVersionFile.data.version.version = prevVersionObj.version;
        newVersionFile.data.date = prevVersionObj.date;
        newVersionFile.content = newDiffVersionDocContent;

        console.log(`Creating new diff version doc ${newDiffVersionDocPath} for ${versionFile.localFilePath}`);
        //console.log(newDiffVersionDocContent);

        saveDoc(newDiffVersionDocPath, newVersionFile, filesChanged);
        updateVersionDataInOldVersions(versionFile.localFilePath, localVersion, localVersion.all.length - 3);
    } else {
        updateVersionDataInOldVersions(versionFile.localFilePath, localVersion, localVersion.all.length - 2);
    }
}

function updateVersionDataInOldVersions(localFilePath: string, version: Version, upToThisVersionIdx?: number) {
    upToThisVersionIdx = upToThisVersionIdx ? upToThisVersionIdx : version.all.length - 1;
    if (upToThisVersionIdx < 0) {
        // No files to process, bust out.
        return;
    }

    // Make a copy to save in the files so all old files get all new versions
    const versionsPath = path.join(path.dirname(localFilePath), VERSIONS_DIR);
    for (let i = 0; i <= upToThisVersionIdx; i++) {
        const versionObj = version.all[i];
        let filePath = getDiffVersionDocFileName(version, versionObj);
        filePath = path.join(versionsPath, filePath);

        const file = getFrontMatterFile(filePath);
        file.data.version.all = version.all;
        file.data.version.current = version.current;
        saveDoc(filePath, file, filesChanged);
    }
}

/*
<ins class="tooltip"> Botmon
is critical for the operability and usability of RStreams as a whole.<span class="top">Added</span></ins>
*/

function getMarkdownDiffContent(oldContent: string, newContent: string): string {
    let result = markdownDiff(oldContent, newContent);

    // Replace any <ins>new content</ins> with this so tooltip will work
    let regex = /<ins>(.+?)<\/ins>/gms;
    result = result.replace(regex, '<ins class="tooltip">$1<span class="top">Added</span></ins>')

    regex = /<del>(.+?)<\/del>/gms;
    result = result.replace(regex, '<del class="tooltip">$1<span class="top">Removed</span></del>')

    return result;
}

/**
 * Don't call this unless there are at least two versions or you'll get an exception.
 * 
 * @param version 
 */
function getPreviousVersion(version: Version, filePath: string): VersionObj {
    if (version.all.length < 2) {
        throw new Error(`Expected at least two versions at this point: filePath: ${filePath}, version: ` + JSON.stringify(version));
    }

    if (!version.render || !version.render.fileName) {
        throw new Error(`Expected render.fileName: filePath: ${filePath}, version: ` + JSON.stringify(version));
    }

    return version.all[version.all.length-2];
}

function getDiffVersionDocFileName(version: Version, versionObj: VersionObj): string {
    return version.render.fileName + `-${versionObj.version}` + (version.render.language ? ('.' + version.render.language) : '') + '.md';
}

/**
 * Go through and init any doc versions not set to 1.0, setting the date to now for those docs
 */
async function initDocs(now: IsoDateString) {
    const docs = await getAllLocalContentFiles();
    for (const doc of docs) {
        let changed = false;
        const fileMatter = getFrontMatterFile(doc);

        // If there's no version number, set the version number and reset the date
        if (!fileMatter.data.version) {
            fileMatter.data.version = {
                version: 1,
                current: 1,
                all: [{version: 1, date: now}],
                render: generateVersionRenderData(doc, fileMatter.data)
            }
            fileMatter.data.date = now;
            changed = true;
        }

        if (changed) {
            saveDoc(doc, fileMatter, filesChanged);
        }
    }
}

function generateVersionRenderData(localFilePath: string, frontMatter: FrontMatter, force?: boolean): VersionRender {
    const hasFileName = frontMatter.version && frontMatter.version.render && frontMatter.version.render.fileName;
    const hasLanguage = frontMatter.version && frontMatter.version.render && frontMatter.version.render.language;
    let result: VersionRender = {fileName: hasFileName ? frontMatter.version.render.fileName : '', 
        language: hasLanguage ? frontMatter.version.render.language : undefined};

    // The file name to use, if in the front matter, get it, and if not set it.
    if (!hasFileName || force === true) {
        result = getFileNameAndLanguageFromDocFile(localFilePath);
    } else {/* we've got a fileName already */}

    return result;
}

(async () => {
    await main();
})()