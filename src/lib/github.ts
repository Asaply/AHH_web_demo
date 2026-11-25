/* Cliente mínimo de la API de GitHub para el panel. Cada guardado es un solo
   commit (Git Data API), así que datos y fotos llegan juntos o no llegan. */

export type GitHubConfig = { token: string; repo: string; branch: string };
export type CommitFile = { path: string; content: string } | { path: string; blobSha: string } | { path: string; delete: true };
export type DeployState = 'pending' | 'success' | 'failure';
export type HistoryEntry = { sha: string; message: string; author: string; date: string };

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class ConflictError extends Error {}

export function createGitHub(config: GitHubConfig, fetchImpl: typeof fetch = fetch) {
  const base = `https://api.github.com/repos/${config.repo}`;

  async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const method = init.method ?? 'GET';
    const res = await fetchImpl(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!res.ok) throw new GitHubError(`GitHub respondió ${res.status} en ${method} ${path}`, res.status);
    return (await res.json()) as T;
  }

  const contents = (path: string, ref: string) =>
    `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`;

  async function fileSha(path: string, ref: string): Promise<string | null> {
    try {
      return (await api<{ sha: string }>(contents(path, ref))).sha;
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return null;
      throw error;
    }
  }

  function treeEntry(file: CommitFile) {
    const entry = { path: file.path, mode: '100644', type: 'blob' };
    if ('delete' in file) return { ...entry, sha: null };
    if ('blobSha' in file) return { ...entry, sha: file.blobSha };
    return { ...entry, content: file.content };
  }

  return {
    async readJson(path: string): Promise<{ data: unknown; sha: string }> {
      const file = await api<{ content: string; sha: string }>(contents(path, config.branch));
      return { data: JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')), sha: file.sha };
    },

    async createBlob(bytes: Uint8Array): Promise<string> {
      const blob = await api<{ sha: string }>('/git/blobs', {
        method: 'POST',
        body: { content: Buffer.from(bytes).toString('base64'), encoding: 'base64' },
      });
      return blob.sha;
    },

    async commit(options: {
      message: string;
      author: { name: string; email: string };
      files: CommitFile[];
      guard?: { path: string; sha: string };
    }): Promise<string> {
      for (let attempt = 0; ; attempt++) {
        const head = (await api<{ object: { sha: string } }>(`/git/ref/heads/${config.branch}`)).object.sha;
        if (options.guard && (await fileSha(options.guard.path, head)) !== options.guard.sha) throw new ConflictError();
        const baseTree = (await api<{ tree: { sha: string } }>(`/git/commits/${head}`)).tree.sha;
        const tree = await api<{ sha: string }>('/git/trees', {
          method: 'POST',
          body: { base_tree: baseTree, tree: options.files.map(treeEntry) },
        });
        const created = await api<{ sha: string }>('/git/commits', {
          method: 'POST',
          body: { message: options.message, tree: tree.sha, parents: [head], author: options.author },
        });
        try {
          await api(`/git/refs/heads/${config.branch}`, { method: 'PATCH', body: { sha: created.sha, force: false } });
          return created.sha;
        } catch (error) {
          // 422 = la rama avanzó entre la lectura y el push. Un reintento sobre
          // el HEAD nuevo; el guard vuelve a revisar que nadie tocó el archivo.
          if (error instanceof GitHubError && error.status === 422 && attempt === 0) continue;
          throw error;
        }
      }
    },

    async history(path: string, limit = 10): Promise<HistoryEntry[]> {
      const commits = await api<Array<{ sha: string; commit: { message: string; author: { name: string; date: string } } }>>(
        `/commits?sha=${encodeURIComponent(config.branch)}&path=${encodeURIComponent(path)}&per_page=${limit}`,
      );
      return commits.map(c => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
      }));
    },

    /* Vercel registra cada deploy como "deployment" de GitHub del commit. */
    async deployState(sha: string): Promise<DeployState> {
      const deployments = await api<Array<{ id: number }>>(`/deployments?sha=${sha}&per_page=5`);
      if (deployments.length === 0) return 'pending';
      const [status] = await api<Array<{ state: string }>>(`/deployments/${deployments[0].id}/statuses?per_page=1`);
      if (status?.state === 'success') return 'success';
      if (status?.state === 'failure' || status?.state === 'error') return 'failure';
      return 'pending';
    },
  };
}

export type GitHub = ReturnType<typeof createGitHub>;
