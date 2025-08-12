// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import simpleGit, { SimpleGit, RemoteWithRefs } from 'simple-git';

// This function is called when your extension is activated.
export function activate(context: vscode.ExtensionContext) {

    // The command has been defined in the package.json file
    // Now we provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('codeshare-by-sarthak.createLink', async () => {
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Codeshare: No active editor found.');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage('Codeshare: Please select code to share.');
            return;
        }

        // --- Get Git and File Information ---
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Codeshare: The file is not part of a workspace.');
            return;
        }

        try {
            const git: SimpleGit = simpleGit(workspaceFolder.uri.fsPath);
            const remotes = await git.getRemotes(true);

            if (remotes.length === 0) {
                vscode.window.showErrorMessage('Codeshare: No Git remotes found for this repository. A remote is required to create a shareable link.');
                return;
            }

            // Find the best remote: origin > upstream > first available
            const targetRemote = remotes.find((remote: RemoteWithRefs) => remote.name === 'origin') || 
                                 remotes.find((remote: RemoteWithRefs) => remote.name === 'upstream') ||
                                 remotes[0];
            
            // Normalize the Git URL from the selected remote
            const repoUrl = targetRemote.refs.fetch.replace(/^git@github.com:/, 'https://github.com/').replace(/\.git$/, '');

            // --- Get current branch ---
            const branch = await git.revparse(['--abbrev-ref', 'HEAD']);

            const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
            const startLine = selection.start.line + 1; // VS Code lines are 0-indexed
            const endLine = selection.end.line + 1;
            const lineRange = `${startLine}-${endLine}`;

            // --- Construct the NEW Universal URI ---
            const baseUrl = 'https://codeshare-web.vercel.app'; // <-- IMPORTANT: USE YOUR VERCEL URL

            // We use base64url to handle special characters like '/' in file paths
            const repoB64 = Buffer.from(repoUrl).toString('base64url');
            const branchB64 = Buffer.from(branch).toString('base64url');
            const fileB64 = Buffer.from(relativePath).toString('base64url');

            // Construct the new URL with the branch
            const uriToShare = `${baseUrl}/l/${repoB64}/${branchB64}/${fileB64}/${lineRange}`;

            // --- Copy to Clipboard and Notify User ---
            await vscode.env.clipboard.writeText(uriToShare);
            vscode.window.showInformationMessage('Codeshare link copied to clipboard!');

        } catch (error: any) {
            console.error('Codeshare error:', error);

            // Check for the specific "not a git repository" error
            if (error && error.message && error.message.includes('not a git repository')) {
                vscode.window.showErrorMessage('Codeshare: This file is not part of a Git repository. A link can only be created for version-controlled files.');
            } else {
                // Keep a generic fallback for other errors
                vscode.window.showErrorMessage('Codeshare: Could not generate link. Please ensure this is a Git repository with a remote configured.');
            }
        }
    });

    context.subscriptions.push(disposable);

    // --- Register the URI Handler ---
    const uriHandler = vscode.window.registerUriHandler({
        async handleUri(uri: vscode.Uri) {
            // uri.path will be '/open'
            // uri.query will be 'repo=...&file=...&lines=...'
            if (uri.path !== '/open') {
                return;
            }

            // Use URLSearchParams for robust query parsing
            const params = new URLSearchParams(uri.query);
            const repoUrl = params.get('repo');
            const fileToOpen = params.get('file');
            const lineRange = params.get('lines');

            if (!repoUrl || !fileToOpen || !lineRange) {
                vscode.window.showErrorMessage('Codeshare: Invalid link format.');
                return;
            }
            
            // --- Find Matching Workspace Folder ---
            const git: SimpleGit = simpleGit();
            let targetWorkspaceFolder: vscode.WorkspaceFolder | undefined = undefined;

            for (const folder of vscode.workspace.workspaceFolders || []) {
                try {
                    const wsGit = git.cwd(folder.uri.fsPath);
                    const remotes = await wsGit.getRemotes(true);
                    
                    if (remotes.length > 0) {
                        // Find the best remote: origin > upstream > first available
                        const targetRemote = remotes.find((r: RemoteWithRefs) => r.name === 'origin') ||
                                             remotes.find((r: RemoteWithRefs) => r.name === 'upstream') ||
                                             remotes[0];
                        
                        const currentRepoUrl = targetRemote.refs.fetch.replace(/^git@github.com:/, 'https://github.com/').replace(/\.git$/, '');
                        if (currentRepoUrl === repoUrl) {
                            targetWorkspaceFolder = folder;
                            break;
                        }
                    }
                } catch (err) {
                    // Not a git repo or other error, ignore and continue
                    console.warn(`Codeshare: could not check git remote for ${folder.uri.fsPath}`, err);
                }
            }

            if (!targetWorkspaceFolder) {
                vscode.window.showErrorMessage(`Codeshare: Repository "${repoUrl}" not found in your open workspaces.`);
                return;
            }
            
            // --- Open the File and Highlight Lines ---
            try {
                const [startLine, endLine] = lineRange.split('-').map(n => parseInt(n, 10));
                const targetUri = vscode.Uri.joinPath(targetWorkspaceFolder.uri, fileToOpen);
                
                const document = await vscode.workspace.openTextDocument(targetUri);
                const editor = await vscode.window.showTextDocument(document);

                // Lines are 0-indexed in the editor, so subtract 1
                const start = new vscode.Position(startLine - 1, 0);
                const end = new vscode.Position(endLine - 1, 0);
                
                editor.selection = new vscode.Selection(start, end);
                editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
            } catch (error) {
                console.error('Codeshare open error:', error);
                vscode.window.showErrorMessage('Codeshare: Could not open the specified file.');
            }
        }
    });

    context.subscriptions.push(uriHandler);
}

// This function is called when your extension is deactivated
export function deactivate() {}
