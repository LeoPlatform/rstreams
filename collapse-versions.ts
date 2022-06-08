import { parse } from 'ts-command-line-args';
import {
    getFrontMatterFile,
    FrontMatterFile,
    VersionObj,
    IsoDateString,
    initBuild,
    getCommits,
    GitCommit,
    getSpecificVersionOfFileFromGit,
    getRelativeFilePath,
    htmlGeneratedFromMarkdownIsSameBetweenTwoFiles,
    VersionObjCollapsed
} from './shared';
import { versions } from 'process';

interface Options {
    filePath: string;
    startVer: number;
    endVer: number;
    help?: boolean;
}

// interface VersionCommit {
//     version: VersionObj;
//     commit: GitCommit;
// }



// interface Versions {
//     data: VersionCommit[];

//     // True if we are turning all versions into one version
//     compressingAllVersions: boolean;

//     // True if there's a version before (older) then the first version we are compressing
//     versionBefore: string | undefined;

//     // Truce if there's a version after (newer) than the version we are compressing
//     versionAfter: string | undefined;
// }

const args = parse<Options>({
    filePath: { type: String, alias: 'f', description: 'Path relative to the project root: content/rstreams-flow/_index.en.md' },
    startVer: { type: Number, alias: 's', description: 'Collapse starting with this version (inclusive): 3' },
    endVer: { type: Number, alias: 'e', description: 'Collapse ending with this version number (inclusive): 5' },
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

    // Init the build directory with a checkout of the lastest from the remote repo
    await initBuild();

    const commits = await getCommits(args.filePath);
    
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

/**
 * Verify that the start/end commit hash/date are present in the git log and legit and 
 * if not, error out.  If they are the same, leave only the last commit value in the array
 * of commits for the collapsed group, removing all but the last commit in the array of commits
 * for the group.
 * 
 * @param ver 
 * @param commits 
 */
function accountForCollapsedVersion(ver: VersionObjCollapsed, commits: GitCommit[]) {
    // Newest commit is at position 0 in the array so loop through until
    // we find it and then validate everything is correct and find the start of the
    // collapsed group
    let endIdx = -1;
    let startIdx = -1;

    for (let j = 0; j < commits.length; j++) {
        const commit = commits[j];
        if (endIdx === -1) {
            if (commit.commitHash === ver.collapsed.endCommitHash) {
                endIdx = j;
                continue;
            }
        } else {
            // We've got an end index, look for the start index
            if (commit.commitHash === ver.collapsed.startCommitHash) {
                startIdx = j;
                break;
            }
        }
    }

    if (endIdx === -1) {
        throw new Error(`Found collapsed version ${ver.version} but didn't find end commit in the log -  ` + 
                        `endCommitHash from file: ${ver.collapsed.endCommitHash}`);
    } else if (new Date(ver.collapsed.endCommitDate).getTime() !== commits[endIdx].commitDate.getTime()) {
        throw new Error(`Found collapsed version ${ver.version} but the commit dates were different between the file end commit and the git log: ` + 
                        `endCommitDate from file: ${ver.collapsed.endCommitDate}, commit date from git log: ${commits[endIdx].commitDate}`); 
    }

    if (startIdx === -1) {
        throw new Error(`Found collapsed version ${ver.version} but didn't find start commit in the log before the end commit -  ` + 
                        `startCommitHash from file: ${ver.collapsed.startCommitHash}`);
    } else if (new Date(ver.collapsed.startCommitDate).getTime() !== commits[startIdx].commitDate.getTime()) {
        throw new Error(`Found collapsed version ${ver.version} but the commit dates were different between the file start commit and the git log: ` + 
                        `startCommitDate from file: ${ver.collapsed.startCommitDate}, commit date from git log: ${commits[startIdx].commitDate}`); 
    }

    if (ver.commitHash !== commits[endIdx].commitHash) {
        throw new Error(`Found collapsed version ${ver.version} but the root commit hash wasn't the end commit hash we found: ` + 
                        `version.commitHash from file: ${ver.commitHash}, end commit hash from collapsed.endCommitHash: ${ver.collapsed.endCommitHash}`); 
    }

    if (new Date(ver.collapsed.endCommitDate).getTime() !== new Date(ver.commitDate).getTime()) {
        throw new Error(`Found collapsed version ${ver.version} but the root commit date wasn't the end commit date we found: ` + 
                        `version.commitDate from file: ${ver.commitDate}, end commit date from collapsed.endCommitDate: ${ver.collapsed.endCommitDate}`); 
    }
    
    if (ver.collapsed.numCommitsCollapsed !== (startIdx - endIdx + 1)) {
        throw new Error(`Found collapsed version ${ver.version} but the collapsed.numCommitsCollapsed - ${ver.collapsed.numCommitsCollapsed} - didn't `+ 
                        `match the number of commits found between the start and end commit hashes from the git log commits - ${startIdx - endIdx + 1}`);
    }

    // Finally, we know we are good.  Everything lined up.  Remove the collapsed commits except for the end commit which we will keep to represent
    // this collapsed group of commits for this version.
    commits.splice(endIdx + 1, startIdx - endIdx);
}

function accountForExistingCollapsedVersions(all: VersionObj[], commits: GitCommit[]) {
    for (let i = all.length - 1; i >= 0; i--) {
        if (all[i].collapsed) {
            accountForCollapsedVersion(all[i] as VersionObjCollapsed, commits);
        } else {/* Not a collapsed veriosn, ignore it for now. */}
    }
}

interface GitCommitPlusIdx {
    commit?: GitCommit;
    idx: number;
    commitIndexesThatDidntChangeDocs: number[];
}

async function ensureCommitFileIsPresent(commit: GitCommit) {
    if (!commit.file) {
        await getSpecificVersionOfFileFromGit(commit.commitHash, getRelativeFilePath(args.filePath, true));
    }
}

/**
 * Walk back in time in the commits (the 0th commit in the array is the newest) until you find one where the doc in question
 * is different from the one being comapred against.  If there was a commit against the file but the docs themselves didn't
 * really change, we don't want it to show up as a version to users.
 * 
 * @returns -2 means it's the first commit all time nothing to compare against, 
 * -1 if we never did find a commit where the docs were different or return the index of the first previous commit where they were different
 */
async function getPreviousCommitWhereTheDocDiffersFromThisCommit(all: VersionObj[], curVersionIdx: number, 
                                                                 commits: GitCommit[], curCommitIdx: number): Promise<GitCommitPlusIdx> {
    const commitIndexesThatDidntChangeDocs: number[] = [];
    if (curCommitIdx === (commits.length - 1)) {
        // Just return the current commit as the one to pair to the current version since there are no more commits before this.
        return {commit: commits[curCommitIdx], idx: curCommitIdx, commitIndexesThatDidntChangeDocs};
    }

    const relFilePath = getRelativeFilePath(args.filePath, true);
    const curCommit = commits[curCommitIdx];
    await ensureCommitFileIsPresent(curCommit);

    let commitFound: GitCommit | undefined;
    let idxOfCommitFound = -1
    let i = curVersionIdx;
    for (let j = curCommitIdx + 1; j < commits.length; j++) {
        await ensureCommitFileIsPresent(curCommit);

        if (htmlGeneratedFromMarkdownIsSameBetweenTwoFiles(curCommit.file.content, commits[j].file.content)) {
            // Gotta keep going back to older commits until we find one that is different from one version to the next
            commitIndexesThatDidntChangeDocs.push(j);
        } else {
            // This is the commit to pair with the version.
            idxOfCommitFound = j;
            commitFound = commits[j];
            break;
        }
    }

    return {commit: commitFound, idx: idxOfCommitFound, commitIndexesThatDidntChangeDocs};
}

async function combineVersionsAndCommitData(file: FrontMatterFile<string>, commits: GitCommit[]) {
    const all = file.data.version.all;
    const commitIndexesThatDidntChangeDocs: number[] = [];

    // Step 1, roll through all the versions and find any that are collapsed and find and confirm those
    // commits exist and remove all but the last commit from the commits array for each collapsed commit group.
    accountForExistingCollapsedVersions(all, commits);

    // Step 2, now we should have exactly 1 commit per version in the list of commits.  There's one wrinkle.
    // It's possible a commit was to change the front matter and didn't actually change the file contents
    // or that whatever change was made did not actually result in a different web page.  If this is the case,
    // we want to skip these commits and act like they don't exist, so skip them.

    // The newest commit is in position 0 in the commits array.
    // The newest version is at the end of the versions.
    let j = 0;
    for (let i = all.length - 1; i >= 0; i--) {
        const ver: VersionObj = all[i];
        const commitFound: GitCommitPlusIdx = await getPreviousCommitWhereTheDocDiffersFromThisCommit(all, i, commits, j);
        // If not on the last version, we're toast, blow up since there are more versions than we have commits to handle
        if (!commitFound.commit) {
            if (i !== 0) {
                throw new Error(`Ran out of commits before ran out of versions - ver: ${ver}, verIdx: ${i}, commitIdx: ${j}`);
            } else {
                // Just use the current commit that we are on as the very first commit version
                commitFound.commit = commits[j];
                commitFound.idx = j;
            }
        } else {/* Good to process */}

        // If the commit found isn't the Jth commit, that means we had to do walk backwards in time to find a commit that actually
        // was a change between doc versions.  Keep track of these indices
        commitIndexesThatDidntChangeDocs.push(...commitFound.commitIndexesThatDidntChangeDocs);       

        
        // We need to know if this commit actually was a commit that changed anything. If not, skip the commit and try the one previous.
        // This puts the file on the GitCommit object file attr.  It's possible a previous iter of the loop already got the file so check first.
        const relFilePath = getRelativeFilePath(args.filePath, true);
        let filesDifferent = false;
        let firstIdx = j;
        let diffIdx = -1;
        for (let k = j; k < commits.length; k++) {
            if (k === (commits.length - 1)) {
                // This is the very first commit which by definition must be a version
            } else {
                // Need to compare the current commit version to the previous commit version and if the underlying document didn't
                // change, we need to cause this one to get collapsed into the previous version, otherwise this commit is the
                // change for the current version we are iterating on
                await getPreviousCommitWhereTheDocDiffersFromThisCommit(all, i, commits, k);
            }
            if (commits[k].file === undefined) {
                getSpecificVersionOfFileFromGit(commits[k].commitHash, relFilePath);
            }

            if (k > j) {
                // We now have at least two commit files retrieved: k and k-1.  Compare the files.  If they are different,
                // then we're good to use the commit represented by j because it actually changed the document and not just
                // the front matter.  If the file contents are the same then we need to move on to the next commit back in 
                // time until we find one that is different.
                const file1 = commits[k-1].file;
                const file2 = commits[k].file;

                if (file1 === undefined) {throw new Error(`Unexpected state: did not get file for commit ${commits[k].commitHash}`);} 
                if (file2 === undefined) {throw new Error(`Unexpected state: did not get file for commit ${commits[k-1].commitHash}`);} 

                if (htmlGeneratedFromMarkdownIsSameBetweenTwoFiles(file1.content, file2.content)) {
                    // Gotta keep going back to older commits until we find one that is different from one version to the next
                } else {

                }
            } else {/* First one.  Need to get the next one before we can compare them. */}
            

            // Capture the current commit hash/date from the git log
            ver.commitHash = commits[j].commitHash;
            ver.commitDate = commits[j].commitDate.toISOString();
        }

        j++;
    }

    // Step 3, find the versions that are to be collapsed and collect up the start/end commit for them
    // and then remove all but the last version to represent the collapsed group from the versions
    // and similarly remove all but the last commit from the collapsed group.

    // Step 4, we can now line everything up and re-version.
}

function validateArgs(file: FrontMatterFile<string>): VersionIndexes {
    if (args.startVer === args.endVer) {
        throw new Error(`Must collapse two or more versions but but found startVer: ${args.startVer}, endVer: ${args.endVer}`);
    }
    if (args.startVer % 1 === 0) {
        throw new Error(`Expected startVer as whole number and instead found ${args.startVer}`);
    }
    if (args.startVer < 1) {
        throw new Error(`Expected startVer to be 1 or greater but found ${args.startVer}`);
    }
    if (args.endVer % 1 === 0) {
        throw new Error(`Expected endVer as whole number and instead found ${args.endVer}`);
    }
    if (args.endVer < 1) {
        throw new Error(`Expected endVer to be 1 or greater but found ${args.endVer}`);
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
    //TODO: does this need to be >=
    if (file.data.version.all.length > commits.length) {
        throw new Error(`Found ${file.data.version.all.length} versions but only have ${commits.length} commits.`);
    }
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