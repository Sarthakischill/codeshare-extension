// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// src/extension.ts
import * as vscode from 'vscode';
import simpleGit, { SimpleGit, RemoteWithRefs } from 'simple-git';
import fetch from 'node-fetch';

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

    const baseUrl = 'https://codeshare-web.vercel.app'; // Your web app URL

    try {
        // --- TRY THE GIT-AWARE METHOD FIRST ---
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (!workspaceFolder) throw new Error("File not in workspace"); // Force fallback

        const git: SimpleGit = simpleGit(workspaceFolder.uri.fsPath);
        // This will throw an error if it's not a git repo, which we'll catch
        const remotes = await git.getRemotes(true);

        if (remotes.length === 0) throw new Error("No remotes found"); // Force fallback

        const targetRemote = remotes.find(r => r.name === 'origin') || remotes.find(r => r.name === 'upstream') || remotes[0];
        const repoUrl = targetRemote.refs.fetch.replace(/^git@github.com:/, 'https://github.com/').replace(/\.git$/, '');
        const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
        const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
        const startLine = selection.start.line + 1;
        const endLine = selection.end.line + 1;

        const repoB64 = Buffer.from(repoUrl).toString('base64url');
        const branchB64 = Buffer.from(branch).toString('base64url');
        const fileB64 = Buffer.from(relativePath).toString('base64url');
        const lineRange = `${startLine}-${endLine}`;

        const uriToShare = `${baseUrl}/l/${repoB64}/${branchB64}/${fileB64}/${lineRange}`;

        await vscode.env.clipboard.writeText(uriToShare);
        vscode.window.showInformationMessage('Codeshare link (Git-aware) copied!');

    } catch (error) {
        // --- FALLBACK TO STATELESS SNIPPET SHARING ---
        vscode.window.showInformationMessage('Not a Git repository. Creating a shareable snippet link...');

        const selectedText = editor.document.getText(selection);
        const languageId = editor.document.languageId;

        try {
            const response = await fetch(`${baseUrl}/api/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: selectedText, language: languageId }),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.error || 'Failed to create snippet on server.');
            }

            const { id } = await response.json();
            const snippetUrl = `${baseUrl}/s/${id}`;

            await vscode.env.clipboard.writeText(snippetUrl);
            vscode.window.showInformationMessage('Codeshare snippet link copied!');

        } catch (apiError: any) {
            console.error('Codeshare API error:', apiError);
            vscode.window.showErrorMessage(`Codeshare: Could not create snippet link: ${apiError.message}`);
        }
    }
});

    // URI handler for opening files from codeshare links
    const uriHandler = vscode.window.registerUriHandler({
        handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
            const query = new URLSearchParams(uri.query);
            const repo = query.get('repo');
            const file = query.get('file');
            const lines = query.get('lines');

            if (repo && file && lines) {
                vscode.window.showInformationMessage(`Opening ${file} from ${repo} at lines ${lines}`);
                // Here you could implement logic to clone/open the repo if needed
            }
        }
    });

    context.subscriptions.push(disposable, uriHandler);
}

// This function is called when your extension is deactivated
export function deactivate() {}
