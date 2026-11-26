import { getServerEnv } from './env';
import { createGitHub } from './github';

export const COMMIT_EMAIL = 'panel@ahh-construccion.invalid';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const github = () => createGitHub(getServerEnv().github);

/* El repo es público: las fotos recién subidas se ven desde aquí antes de que
   termine el deploy. */
export const rawBaseUrl = () => {
  const { repo, branch } = getServerEnv().github;
  return `https://raw.githubusercontent.com/${repo}/${branch}/public`;
};
