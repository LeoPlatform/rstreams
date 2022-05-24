import { parse } from 'ts-command-line-args';
import * as shell from 'shelljs';
import {
    getFrontMatterFile,
    FrontMatterFile,
    VersionObj,
    IsoDateString,
    initBuild
} from './shared';
import { versions } from 'process';

interface Options {
    filePath: string;
    startVer: string;
    endVer: string;
    help?: boolean;
}

interface GitCommit {
    commitHash: string;
    commitDate: Date;
}

interface VersionCommit {
    version: VersionObj;
    commit: GitCommit;
}

interface Versions {
    data: VersionCommit[];

    // True if we are turning all versions into one version
    compressingAllVersions: boolean;

    // True if there's a version before (older) then the first version we are compressing
    versionBefore: string | undefined;

    // Truce if there's a version after (newer) than the version we are compressing
    versionAfter: string | undefined;
}

const args = parse<Options>({
    filePath: { type: String, alias: 'f', description: 'Path relative to the project root: content/rstreams-flow/_index.en.md' },
    startVer: { type: String, alias: 's', description: 'Collapse starting with this version (inclusive): 1.2' },
    endVer: { type: String, alias: 'e', description: 'Collapse ending with this version number (inclusive): 1.4' },
    help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' },
}, {
    helpArg: 'help',
    headerContentSections: [{ header: 'Doc Version Collapser', content: 'Given a markdown file in the content directory, this will ' + 
        'read the front matter and collapse multiple versions into a single version with a single diff file from the collapsed ' + 
        'version back to the first version before it was collapsed, deleting unneeded diff files and fixing the version information ' + 
        'in all remaining files so version history continues to work.  Since a single commit creates a new version, this is useful ' + 
        'when lots of small commits can/should be combined into a single "version."' }],
},);

async function main() {
    // Get the file with the version data in the front matter of the markdown file
    const file = getFrontMatterFile(args.filePath, true);
    const versionIndexes: VersionIndexes = validateArgs(file);
    const commits = await getCommits();

    // Init the build directory with a checkout of the lastest in the remote repo
    await initBuild();
    
    validateCommits(file, commits);
    combineVersionsAndCommitData(file, commits);
    recreateVersions(file, versionIndexes);
}

function recreateVersions(file: FrontMatterFile<string>, idx: VersionIndexes) {
    const all = file.data.version.all;

    let obj = {
        startCommitHash: '',
        startCommitDate: '',
        endCommitHash:  '',
        endCommitDate: '',
        numCommitsCollapsed: 0,
        startIdxToDelete: -1,
        endIdxToDelete:-1
    }

    // Loop through the versions that are to be collapsed and remove those that aren't needed,
    // leaving the last version to represent the collapsed group
    for (let i = idx.startVerIdx; i <= idx.endVerIdx; i++) {
        const v = all[i];
        let value: string | undefined;
        if (i === idx.startVerIdx || i === idx.endVerIdx) {
            const type = i === idx.startVerIdx ? 'start' : 'end';
            value = v.commitHash;
            if (value !== undefined) {
                obj[type + 'CommitHash'] = value;
                
            } else {throw new Error(`A version that should have a commit hash didn't for idx of ${i} - ${v}`);}
            value = v.commitDate;
            if (value !== undefined) {
                obj[type + 'CommitDate'] = value;
            } else {throw new Error(`A version that should have a commit date didn't for idx of ${i} - ${v}`);}
            obj[type + 'IdxToDelete'] = i === idx.startVerIdx ? i : i - 1;
        } else {/* It's a version in between that don't need for bookkeeping */}

        obj.numCommitsCollapsed += v.collapsed ? v.collapsed.numCommitsCollapsed : 1;
    }

    // Delete unneeded versions
    all.splice(obj.startIdxToDelete, (obj.endIdxToDelete + 1) - obj.startIdxToDelete)

    // 
}

function combineVersionsAndCommitData(file: FrontMatterFile<string>, commits: GitCommit[]) {
    const all = file.data.version.all;

    // The newest commit is in position 0 in the commits array.
    // The newest version is at the end of the versions.
    let j = 0;
    for (let i = all.length - 1; i >= 0; i--) {
        const ver: VersionObj = all[i];
        
        // Is this version collapsed?  
        if (ver.collapsed) {
            // The current commit should be the end commit of this collapsed version
            if (ver.collapsed.endCommitHash !== commits[j].commitHash || 
                new Date(ver.collapsed.endCommitDate).getTime() !== commits[j].commitDate.getTime()) {
                throw new Error(`Found collapsed version ${ver.version} whose end commit hash or commit date didn't line up with commit log: ` + 
                                `endCommitHash from file: ${ver.collapsed.endCommitHash}, commit hash from git log: ${commits[j].commitHash}, ` +
                                `endCommitDate from file: ${ver.collapsed.endCommitDate}, commit date from git log: ${commits[j].commitDate}`);
            }

            // We need to skip commits to the last commit that is the end of this version.
            j += (ver.collapsed.numCommitsCollapsed - 1);

            // The current commit should now be the start commit of this collapsed verison
            if (ver.collapsed.startCommitHash !== commits[j].commitHash || 
                new Date(ver.collapsed.startCommitDate).getTime() !== commits[j].commitDate.getTime()) {
                throw new Error(`Found collapsed version ${ver.version} whose start commit hash or commit date didn't line up with commit log: ` + 
                                `startCommitHash from file: ${ver.collapsed.startCommitHash}, commit hash from git log: ${commits[j].commitHash}, ` +
                                `startCommitDate from file: ${ver.collapsed.startCommitDate}, commit date from git log: ${commits[j].commitDate}`);
            }
        } else {
            // Capture the current commit hash/date from the git log
            ver.commitHash = commits[j].commitHash;
            ver.commitDate = commits[j].commitDate.toISOString();
        }

        j++;
    }
}

function validateArgs(file: FrontMatterFile<string>): VersionIndexes {
    let arr = args.startVer.split('.');

    if (args.startVer === args.endVer) {
        throw new Error(`Must collapse two or more versions but but found startVer: ${args.startVer}, endVer: ${args.endVer}`);
    }
    if (arr.length !== 2) {
        throw new Error(`Expected startVer arg as <major>.<minor> and instead found ${args.startVer}`);
    }
    arr = args.endVer.split('.');
    if (arr.length !== 2) {
        throw new Error(`Expected endVer arg as <major>.<minor> and instead found ${args.endVer}`);
    }
    if (args.startVer >= args.endVer) {
        throw new Error(`Expected startVer arg to be less than endVer arg but found startVer: ${args.startVer}, endVer: ${args.endVer}`);
    }
    if (args.endVer > file.data.version.current) {
        throw new Error(`Expected args endVer to be less than or equal to the current version but found endVer: `+ 
                        `${args.endVer}, currentVer: ${file.data.version.current} for ${args.filePath}`);
    }

    let startVerIdx = -1;
    let endVerIdx = -1;
    for (let i = 0; i < file.data.version.all.length; i++) {
        const version = file.data.version.all[i];
        if (version.version === args.startVer) {
            if (startVerIdx !== -1) {
                throw new Error(`Found the same version more than once in the list of all versions for ` +
                                `${file.data.version.render.fileName}, ${JSON.stringify(file.data.version)} for ${args.filePath}`);
            }
            startVerIdx = i;
        }
        if (version.version === args.endVer) {
            if (endVerIdx !== -1) {
                throw new Error(`Found the same version more than once in the list of all versions for ` +
                                `${file.data.version.render.fileName}, ${JSON.stringify(file.data.version)} for ${args.filePath}`);
            }
            endVerIdx = i;
        }
    }

    if (startVerIdx === -1) {
        throw new Error(`Did not find startVer in the list of versions for this file: ${JSON.stringify(file.data.version)}`);
    }

    if (endVerIdx === -1) {
        throw new Error(`Did not find endVer in the list of versions for this file: ${JSON.stringify(file.data.version)}`);
    }

    if (startVerIdx >= endVerIdx) {
        throw new Error(`The startVer appears to be the same or after the endVer in the list of versions: ${JSON.stringify(file.data.version)}`);
    }

    return {startVerIdx, endVerIdx};
}

function validateCommits(file: FrontMatterFile<string>, commits: GitCommit[]) {
    if (file.data.version.all.length > commits.length) {
        throw new Error(`Found ${file.data.version.all.length} versions but only have ${commits.length} commits.`);
    }
}

async function getCommits(): Promise<GitCommit[]> {
    //TODO: will we need to set baseDir: BUILD_DIR in the options you can pass in?
    const commitHistory: shell.ShellString = shell.exec(`git log --follow --pretty="%H@%aD" ${args.filePath}`, { silent: true });
    const lines = commitHistory.split('\n');
    const result: GitCommit[] = [];
    
    for (const line of lines) {
        // The last line might just be an empty string I saw
        if (line.trim().length === 0) {continue}

        const arr = line.split('@');
        if (arr.length !== 2) {
            throw new Error('Expected each non empty git log entry to have hash@date format and instead found ${line}');
        } else {/* good to go*/}
        result.push({commitHash: arr[0], commitDate: new Date(arr[1])});
    }

    return result;
}

interface VersionIndexes {
    // The index in the list of all versions for the startVer we are to collapse starting from (inclusive)
    startVerIdx: number;

    // The index in the list of all versions for the endVer we are to collapse up to (inclusive)
    endVerIdx: number;
}

(async () => {
    await main();
})()