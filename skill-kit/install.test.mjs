import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, lstat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const installer = fileURLToPath(new URL('./install.mjs', import.meta.url));
const run = (script, ...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const temporary = () => mkdtemp(path.join(tmpdir(), 'landing-admin-kit-test-'));

test('install preserves project rules, repeats without changes, and exported kit works independently', async () => {
  const root = await temporary();
  const project = path.join(root, 'project with spaces');
  await mkdir(project);
  const original = '# Existing project\r\nKeep deployment policy.\r\n';
  await writeFile(path.join(project, 'AGENTS.md'), original);
  let result = run(installer, project);
  assert.equal(result.status, 0, result.stderr);
  const instructions = await readFile(path.join(project, 'AGENTS.md'), 'utf8');
  assert.ok(instructions.startsWith(original));
  result = run(installer, project);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(path.join(project, 'AGENTS.md'), 'utf8'), instructions);

  const bundle = path.join(root, 'bundle');
  result = run(installer, '--export', bundle);
  assert.equal(result.status, 0, result.stderr);
  const second = path.join(root, 'second');
  await mkdir(second);
  result = run(path.join(bundle, 'install.mjs'), second);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(await readFile(path.join(second, '.agents/skills/ui-ux-pro-max/data/styles.csv')), await readFile(path.join(bundle, 'skills/ui-ux-pro-max/data/styles.csv')));
  const python = spawnSync('python', ['-B', path.join(second, '.agents/skills/ui-ux-pro-max/scripts/search.py'), 'keyboard focus modal', '--domain', 'ux', '--json'], { encoding: 'utf8' });
  assert.equal(python.status, 0, python.stderr);
  assert.ok(JSON.parse(python.stdout).count > 0);
});

test('conflicting custom skill stops before adding any files or changing AGENTS', async () => {
  const project = await temporary();
  const custom = path.join(project, '.agents/skills/humanizer');
  await mkdir(custom, { recursive: true });
  await writeFile(path.join(custom, 'SKILL.md'), 'My customized skill');
  await writeFile(path.join(project, 'AGENTS.md'), 'Keep this');
  const result = run(installer, project);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Conflict/);
  assert.equal(await readFile(path.join(project, 'AGENTS.md'), 'utf8'), 'Keep this');
  assert.equal(await readFile(path.join(custom, 'SKILL.md'), 'utf8'), 'My customized skill');
  await assert.rejects(lstat(path.join(project, '.agents/skills/landing-admin')), { code: 'ENOENT' });
});

test('rejects a junction or symlink redirecting the installation', async () => {
  const root = await temporary();
  const project = path.join(root, 'project');
  const outside = path.join(root, 'outside');
  await mkdir(project);
  await mkdir(outside);
  await symlink(outside, path.join(project, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = run(installer, project);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /symlink\/junction/);
  await assert.rejects(lstat(path.join(outside, 'skills')), { code: 'ENOENT' });
});
