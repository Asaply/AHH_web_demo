import { createInterface } from 'node:readline';
import { hashPassword } from '../src/lib/auth.ts';

/* Genera una entrada para ADMIN_USERS sin que la contraseña quede en el
   historial de la terminal. Uso: npm run admin:user -- correo "Nombre" */
const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ').trim();

if (!email || !name) {
  console.error('Uso: npm run admin:user -- correo@ejemplo.com "Nombre Apellido"');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
const output = rl as unknown as { _writeToOutput: (s: string) => void };
let prompt = '';
output._writeToOutput = (s: string) => {
  // Muestra la pregunta pero no lo que se teclea.
  if (s.startsWith(prompt)) process.stdout.write(prompt);
};
const lines = rl[Symbol.asyncIterator]();

async function askHidden(question: string): Promise<string> {
  prompt = question;
  process.stdout.write(question);
  const { value } = await lines.next();
  process.stdout.write('\n');
  return String(value ?? '');
}

const password = await askHidden('Contraseña (mínimo 10 caracteres): ');
if (password.length < 10) {
  console.error('La contraseña debe tener al menos 10 caracteres.');
  process.exit(1);
}
if ((await askHidden('Repite la contraseña: ')) !== password) {
  console.error('Las contraseñas no coinciden.');
  process.exit(1);
}
rl.close();

console.log(`\n${JSON.stringify({ email: email.toLowerCase(), name, hash: hashPassword(password) })}`);
console.log('\nAgrega este objeto al arreglo de ADMIN_USERS: [ {...}, {...} ]');
