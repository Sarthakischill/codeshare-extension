declare module 'simple-git' {
  export interface RemoteWithRefs {
    name: string;
    refs: {
      fetch: string;
      push: string;
    };
  }

  export interface SimpleGit {
    getRemotes(verbose?: boolean): Promise<RemoteWithRefs[]>;
    revparse(options: string[]): Promise<string>;
    cwd(path: string): SimpleGit;
  }

  export default function simpleGit(baseDir?: string): SimpleGit;
  export { SimpleGit, RemoteWithRefs };
}