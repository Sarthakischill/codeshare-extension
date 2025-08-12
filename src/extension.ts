// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// src/extension.ts
import * as vscode from "vscode";
import simpleGit, { SimpleGit } from "simple-git";
import fetch from "node-fetch";

// This function is called when your extension is activated.
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now we provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "codeshare-by-sarthak.createLink",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("Codeshare: No active editor found.");
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showErrorMessage(
          "Codeshare: Please select code to share."
        );
        return;
      }

      const baseUrl = "https://codeshare.sarthaks.tech"; // Your web app URL

      try {
        // --- TRY THE GIT-AWARE METHOD FIRST ---
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          editor.document.uri
        );
        if (!workspaceFolder) {
          throw new Error("File not in workspace"); // Force fallback
        }

        const git: SimpleGit = simpleGit(workspaceFolder.uri.fsPath);
        // This will throw an error if it's not a git repo, which we'll catch
        const remotes = await git.getRemotes(true);

        if (remotes.length === 0) {
          throw new Error("No remotes found"); // Force fallback
        }

        const targetRemote =
          remotes.find((r) => r.name === "origin") ||
          remotes.find((r) => r.name === "upstream") ||
          remotes[0];
        const repoUrl = targetRemote.refs.fetch
          .replace(/^git@github.com:/, "https://github.com/")
          .replace(/\.git$/, "");
        const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
        const relativePath = vscode.workspace.asRelativePath(
          editor.document.uri
        );
        const startLine = selection.start.line + 1;
        const endLine = selection.end.line + 1;

        const repoB64 = Buffer.from(repoUrl).toString("base64url");
        const branchB64 = Buffer.from(branch).toString("base64url");
        const fileB64 = Buffer.from(relativePath).toString("base64url");
        const lineRange = `${startLine}-${endLine}`;

        const uriToShare = `${baseUrl}/l/${repoB64}/${branchB64}/${fileB64}/${lineRange}`;

        await vscode.env.clipboard.writeText(uriToShare);
        vscode.window.showInformationMessage(
          "Codeshare link (Git-aware) copied!"
        );
      } catch (error) {
        // --- FALLBACK TO STATELESS SNIPPET SHARING ---
        vscode.window.showInformationMessage(
          "Not a Git repository. Creating a shareable snippet link..."
        );

        const selectedText = editor.document.getText(selection);
        const languageId = editor.document.languageId;

        try {
          const response = await fetch(`${baseUrl}/api/share`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: selectedText, language: languageId }),
          });

          if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(
              errorBody.error || "Failed to create snippet on server."
            );
          }

          const { id } = await response.json();
          const snippetUrl = `${baseUrl}/s/${id}`;

          await vscode.env.clipboard.writeText(snippetUrl);
          vscode.window.showInformationMessage(
            "Codeshare snippet link copied!"
          );
        } catch (apiError: any) {
          console.error("Codeshare API error:", apiError);
          vscode.window.showErrorMessage(
            `Codeshare: Could not create snippet link: ${apiError.message}`
          );
        }
      }
    }
  );

  // URI handler for opening files from codeshare links
  const uriHandler = vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      // Example URI: vscode://sarthakischill.codeshare-by-sarthak/open?repo=...&file=...&lines=10-25
      if (uri.path !== "/open") {
        return;
      }

      const params = new URLSearchParams(uri.query);
      const repoUrl = params.get("repo");
      const fileToOpen = params.get("file");
      const lineRangeStr = params.get("lines");

      if (!repoUrl || !fileToOpen || !lineRangeStr) {
        vscode.window.showErrorMessage(
          "Codeshare: Invalid link format. Missing parameters."
        );
        return;
      }

      // Find the workspace folder that matches this repository
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          "Codeshare: No workspace folders are open."
        );
        return;
      }

      let targetWorkspaceFolder: vscode.WorkspaceFolder | undefined;

      // Try to match the repository URL with one of the open workspace folders
      for (const folder of workspaceFolders) {
        try {
          const git: SimpleGit = simpleGit(folder.uri.fsPath);
          const remotes = await git.getRemotes(true);

          for (const remote of remotes) {
            const remoteUrl = remote.refs.fetch
              .replace(/^git@github.com:/, "https://github.com/")
              .replace(/\.git$/, "");
            if (remoteUrl === repoUrl) {
              targetWorkspaceFolder = folder;
              break;
            }
          }
          if (targetWorkspaceFolder) {
            break;
          }
        } catch (error) {
          // This folder might not be a git repository, continue checking others
          continue;
        }
      }

      if (!targetWorkspaceFolder) {
        vscode.window.showErrorMessage(
          `Codeshare: Repository "${repoUrl}" not found in your open workspaces.`
        );
        return;
      }

      try {
        // --- ROBUST LINE PARSING ---
        const [startStr, endStr] = lineRangeStr.split("-");
        // VS Code lines are 0-indexed. The link uses 1-indexed lines.
        const startLine = parseInt(startStr, 10) - 1;

        // If endStr is missing (e.g., "9-9" was sent as "9"), use startStr.
        const endLine = endStr ? parseInt(endStr, 10) - 1 : startLine;

        // Basic validation
        if (
          isNaN(startLine) ||
          isNaN(endLine) ||
          startLine < 0 ||
          endLine < 0
        ) {
          vscode.window.showErrorMessage(
            "Codeshare: Invalid line numbers in link."
          );
          return;
        }

        const targetUri = vscode.Uri.joinPath(
          targetWorkspaceFolder.uri,
          fileToOpen
        );

        const document = await vscode.workspace.openTextDocument(targetUri);
        const editor = await vscode.window.showTextDocument(document);

        // --- CORRECT SELECTION AND REVEAL LOGIC ---
        // Create the start and end positions. For end, go to the end of the line.
        const start = new vscode.Position(startLine, 0);
        const end = new vscode.Position(
          endLine,
          editor.document.lineAt(endLine).range.end.character
        );

        const selection = new vscode.Selection(start, end);
        editor.selection = selection;

        // This is the key part to bring it into view properly.
        editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
      } catch (error) {
        console.error("Codeshare open error:", error);
        vscode.window.showErrorMessage(
          `Codeshare: Could not open or select in file: ${fileToOpen}`
        );
      }
    },
  });

  context.subscriptions.push(disposable, uriHandler);
}

// This function is called when your extension is deactivated
export function deactivate() {}
