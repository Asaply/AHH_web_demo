import { ADMIN_USERS, GITHUB_BRANCH, GITHUB_REPO, GITHUB_TOKEN, SESSION_SECRET } from 'astro:env/server';
import { parseUsers, type AdminUser } from './auth';

export type ServerEnv = {
  users: AdminUser[];
  sessionSecret: string;
  github: { token: string; repo: string; branch: string };
};

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Falta la variable de entorno ${name} (ver .env.example).`);
  return value;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const sessionSecret = required('SESSION_SECRET', SESSION_SECRET);
  if (sessionSecret.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  cached = {
    users: parseUsers(required('ADMIN_USERS', ADMIN_USERS)),
    sessionSecret,
    github: { token: required('GITHUB_TOKEN', GITHUB_TOKEN), repo: GITHUB_REPO, branch: GITHUB_BRANCH },
  };
  return cached;
}
