// This mirror was retired on 2026-10-30: the three packages now live in
// FlashyFinancial/wallet-core as @flashyfinancial/{wallet-wdk,signer,wdk}.
// A retired repository has two things that can quietly stop being true. The
// README's first line is the banner that tells a stranger not to depend on
// this tree — a re-mirror or a merge of an old branch could push it down or
// drop it. And every package.json here must be `private: true`, because a
// manifest that is publishable is one `npm publish` away from putting a stale
// @flashyos/* on the registry beside the real package. This test holds both,
// and holds the scheduled scans to manual dispatch, so the retirement is a
// property the suite checks rather than a sentence somebody remembers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SUCCESSOR = 'https://github.com/FlashyFinancial/wallet-core'
const RETIRED_ON = '2026-10-30'

const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')

test('the README opens with the retirement banner, before anything else', () => {
  const firstLine = readme.split('\n')[0]
  assert.match(firstLine, /^> \*\*Retired 2026-10-30/, `the first line of README.md is not the banner: "${firstLine}"`)
  assert.ok(firstLine.includes(RETIRED_ON), 'the banner does not date the retirement')
  assert.ok(firstLine.includes(SUCCESSOR), 'the banner does not name the successor repository')
  assert.ok(firstLine.includes('nothing here is updated'), 'the banner does not say the tree is frozen')
  for (const name of ['@flashyfinancial/wallet-wdk', '@flashyfinancial/signer', '@flashyfinancial/wdk']) {
    assert.ok(firstLine.includes(name), `the banner does not name the successor package ${name}`)
  }
  assert.ok(firstLine.includes('@flashyos/*'), 'the banner does not say what to install until the first release lands')
})

const manifests = [
  'package.json',
  ...readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `packages/${d.name}/package.json`),
]

test('every package here is found, so a new workspace cannot sit outside the check', () => {
  assert.ok(manifests.length >= 4, `expected the root and at least three workspaces, found ${manifests.length}`)
})

for (const rel of manifests) {
  test(`${rel} is private: nothing from a retired mirror may reach a registry`, () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, rel), 'utf8'))
    assert.equal(pkg.private, true, `${rel} is publishable (private is ${JSON.stringify(pkg.private)})`)
  })
}

test('no workflow runs on a schedule any more; only manual dispatch and the CI that checks a pull request', () => {
  const dir = join(ROOT, '.github', 'workflows')
  for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    const text = readFileSync(join(dir, file), 'utf8')
    assert.doesNotMatch(text, /^\s+schedule:\s*$/m, `${file} still has a schedule trigger`)
    if (file !== 'ci.yml') {
      assert.match(text, /^on:\n\s+workflow_dispatch:\s*$/m, `${file} is not workflow_dispatch only`)
      assert.match(text, /Retired 2026-10-30/, `${file} does not say why its triggers were removed`)
    }
  }
})
