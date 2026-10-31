import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const names = ['landing-admin', 'frontend-design', 'vercel-react-best-practices', 'web-design-guidelines', 'ui-ux-pro-max', 'ponytail', 'humanizer', 'i-have-adhd'];
const marker = '<!-- BEGIN:landing-admin-kit -->';
const block = `${marker}
## Landing page and admin skills

For landing-page or admin UI tasks, read and apply .agents/skills/landing-admin/SKILL.md. It routes to the bundled design, React, accessibility, implementation and writing skills only as needed. Preserve the project's stack, brand, security and release rules; installed framework documentation takes precedence over generic skill examples. Installing this kit does not authorize deployment. The i-have-adhd response style is available on request and is not a medical assumption.
<!-- END:landing-admin-kit -->`;

async function stat(file) {
  try { return await lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Refuse symlinks/junctions at every existing ancestor, including the target root.
async function safePath(file) {
  const parent = path.dirname(file);
  if (parent !== file) await safePath(parent);
  const info = await stat(file);
  if (info?.isSymbolicLink()) throw new Error(`Refusing symlink/junction: ${file}`);
}

async function files(dir) {
  await safePath(dir);
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['__pycache__', '.DS_Store'].includes(entry.name) || entry.name.endsWith('.pyc')) continue;
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing source symlink: ${file}`);
    if (entry.isDirectory()) result.push(...await files(file));
    else if (entry.isFile()) result.push(file);
    else throw new Error(`Unsupported source file: ${file}`);
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const exporting = args[0] === '--export';
  const targetArg = exporting ? args[1] : args[0];
  if (!targetArg || args.length !== (exporting ? 2 : 1)) {
    throw new Error('Usage: node install.mjs <existing-project-directory> | --export <new-bundle-directory>');
  }
  const target = path.resolve(targetArg);
  await safePath(target);
  const targetInfo = await stat(target);
  if (exporting ? targetInfo !== null : !targetInfo?.isDirectory()) {
    throw new Error(exporting ? 'Export target must not exist.' : 'Project directory must already exist.');
  }
  const source = await stat(path.join(here, 'skills')) ? path.join(here, 'skills') : path.resolve(here, '../.agents/skills');
  if (target === source || target.startsWith(source + path.sep)) throw new Error('Target cannot be inside the skill source.');
  const plan = [];
  for (const name of names) {
    const dir = path.join(source, name);
    if (!(await stat(path.join(dir, 'SKILL.md')))?.isFile()) throw new Error(`Missing skill: ${name}`);
    for (const file of await files(dir)) {
      plan.push([path.join(target, exporting ? 'skills' : '.agents/skills', name, path.relative(dir, file)), await readFile(file)]);
    }
  }
  for (const name of ['sources.json', 'README.md', 'install.mjs']) {
    const destination = exporting ? path.join(target, name) : path.join(target, '.agents/landing-admin-kit', name);
    // The installer lives at the bundle/repository level, not inside target metadata.
    if (!exporting && name === 'install.mjs') continue;
    plan.push([destination, await readFile(path.join(here, name))]);
  }
  let agentWrite;
  if (!exporting) {
    const agentFile = path.join(target, 'AGENTS.md');
    await safePath(agentFile);
    const old = await stat(agentFile) ? await readFile(agentFile, 'utf8') : '';
    if (!old.includes(marker)) agentWrite = [agentFile, Buffer.from(old + (old.endsWith('\n') || !old ? '' : '\n') + '\n' + block + '\n')];
    else if (!old.includes(block)) throw new Error('Existing skill-kit instructions differ. Review and merge them manually.');
  }
  const pending = [];
  // Check every collision before writing anything; existing customized skills survive.
  for (const [destination, data] of plan) {
    await safePath(destination);
    const info = await stat(destination);
    if (info) {
      if (!info.isFile() || !(await readFile(destination)).equals(data)) throw new Error(`Conflict; no files written: ${destination}`);
    } else pending.push([destination, data]);
  }
  for (const [destination, data] of pending) {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, data, { flag: 'wx' });
  }
  if (agentWrite) await writeFile(...agentWrite);
  console.log(`${exporting ? 'Exported' : 'Installed'} ${names.length} skills into ${target}; ${pending.length} new files. Existing project instructions preserved.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
