import { describe, expect, it } from 'vitest';
import { ConflictError, createGitHub, GitHubError } from './github';

type Handler = (body: any, call: number) => { status?: number; json?: unknown };

function fakeGitHub(routes: Record<string, Handler>) {
  const calls: { method: string; path: string; body: any }[] = [];
  const counts = new Map<string, number>();
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url).replace('https://api.github.com/repos/o/r', '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    const key = `${method} ${path}`;
    const handler = routes[key];
    if (!handler) return new Response('{}', { status: 404 });
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    const out = handler(body, n);
    return new Response(JSON.stringify(out.json ?? {}), { status: out.status ?? 200 });
  };
  return { gh: createGitHub({ token: 't', repo: 'o/r', branch: 'main' }, fetchImpl as typeof fetch), calls };
}

const PATH = 'src/content/properties.json';
const author = { name: 'Omar', email: 'panel@ahh-construccion.invalid' };

describe('readJson', () => {
  it('decodifica el contenido y devuelve el sha', async () => {
    const { gh } = fakeGitHub({
      [`GET /contents/${PATH}?ref=main`]: () => ({ json: { sha: 'abc', content: Buffer.from('[{"a":1}]').toString('base64') } }),
    });
    expect(await gh.readJson(PATH)).toEqual({ data: [{ a: 1 }], sha: 'abc' });
  });

  it('lanza GitHubError con el status', async () => {
    const { gh } = fakeGitHub({});
    await expect(gh.readJson(PATH)).rejects.toMatchObject({ status: 404 });
  });
});

describe('commit', () => {
  const happy = (overrides: Record<string, Handler> = {}) => ({
    'GET /git/ref/heads/main': () => ({ json: { object: { sha: 'head1' } } }),
    [`GET /contents/${PATH}?ref=head1`]: () => ({ json: { sha: 'file1' } }),
    'GET /git/commits/head1': () => ({ json: { tree: { sha: 'tree1' } } }),
    'POST /git/trees': () => ({ json: { sha: 'tree2' } }),
    'POST /git/commits': () => ({ json: { sha: 'commit2' } }),
    'PATCH /git/refs/heads/main': () => ({ json: {} }),
    ...overrides,
  });

  it('arma un tree con contenido, blobs y borrados y mueve la rama sin force', async () => {
    const { gh, calls } = fakeGitHub(happy());
    const sha = await gh.commit({
      message: 'Panel: prueba',
      author,
      guard: { path: PATH, sha: 'file1' },
      files: [
        { path: PATH, content: '[]\n' },
        { path: 'public/img/propiedades/x/a.jpg', blobSha: 'blob1' },
        { path: 'public/img/propiedades/x/b.jpg', delete: true },
      ],
    });
    expect(sha).toBe('commit2');
    const tree = calls.find(c => c.path === '/git/trees')!.body;
    expect(tree.base_tree).toBe('tree1');
    expect(tree.tree).toEqual([
      { path: PATH, mode: '100644', type: 'blob', content: '[]\n' },
      { path: 'public/img/propiedades/x/a.jpg', mode: '100644', type: 'blob', sha: 'blob1' },
      { path: 'public/img/propiedades/x/b.jpg', mode: '100644', type: 'blob', sha: null },
    ]);
    expect(calls.find(c => c.path === '/git/commits')!.body).toEqual({ message: 'Panel: prueba', tree: 'tree2', parents: ['head1'], author });
    expect(calls.find(c => c.method === 'PATCH')!.body).toEqual({ sha: 'commit2', force: false });
  });

  it('lanza ConflictError si el archivo cambió desde que se leyó', async () => {
    const { gh, calls } = fakeGitHub(happy());
    await expect(gh.commit({ message: 'm', author, guard: { path: PATH, sha: 'viejo' }, files: [] })).rejects.toBeInstanceOf(ConflictError);
    expect(calls.some(c => c.path === '/git/trees')).toBe(false);
  });

  it('reintenta una vez si la rama se movió entre medio', async () => {
    const { gh, calls } = fakeGitHub(happy({
      'GET /git/ref/heads/main': (_b, n) => ({ json: { object: { sha: n === 1 ? 'head1' : 'head2' } } }),
      [`GET /contents/${PATH}?ref=head2`]: () => ({ json: { sha: 'file1' } }),
      'GET /git/commits/head2': () => ({ json: { tree: { sha: 'tree9' } } }),
      'PATCH /git/refs/heads/main': (_b, n) => (n === 1 ? { status: 422 } : { json: {} }),
    }));
    await gh.commit({ message: 'm', author, guard: { path: PATH, sha: 'file1' }, files: [{ path: PATH, content: '[]\n' }] });
    const commits = calls.filter(c => c.path === '/git/commits');
    expect(commits.map(c => c.body.parents[0])).toEqual(['head1', 'head2']);
  });

  it('no reintenta más de una vez', async () => {
    const { gh } = fakeGitHub(happy({ 'PATCH /git/refs/heads/main': () => ({ status: 422 }) }));
    await expect(gh.commit({ message: 'm', author, files: [] })).rejects.toBeInstanceOf(GitHubError);
  });
});

describe('deployState', () => {
  const withStatus = (state?: string) => fakeGitHub({
    'GET /deployments?sha=c1&per_page=5': () => ({ json: state === undefined ? [] : [{ id: 7 }] }),
    'GET /deployments/7/statuses?per_page=1': () => ({ json: [{ state }] }),
  }).gh;

  it('traduce los estados de Vercel', async () => {
    expect(await withStatus(undefined).deployState('c1')).toBe('pending');
    expect(await withStatus('in_progress').deployState('c1')).toBe('pending');
    expect(await withStatus('success').deployState('c1')).toBe('success');
    expect(await withStatus('error').deployState('c1')).toBe('failure');
    expect(await withStatus('failure').deployState('c1')).toBe('failure');
  });
});

describe('history', () => {
  it('devuelve la primera línea del mensaje', async () => {
    const { gh } = fakeGitHub({
      'GET /commits?sha=main&path=src%2Fcontent&per_page=10': () => ({
        json: [{ sha: 's1', commit: { message: 'Panel: precio\n\ncuerpo', author: { name: 'Omar', date: '2026-11-24T10:00:00Z' } } }],
      }),
    });
    expect(await gh.history('src/content')).toEqual([{ sha: 's1', message: 'Panel: precio', author: 'Omar', date: '2026-11-24T10:00:00Z' }]);
  });
});
