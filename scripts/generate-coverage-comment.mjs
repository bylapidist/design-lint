import { readFile, writeFile } from 'node:fs/promises';

async function main() {
  const coverage = JSON.parse(
    await readFile('coverage/coverage-summary.json', 'utf8')
  );
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const thresholds = pkg.c8 ?? {};
  const metrics = [
    ['Statements', coverage.total.statements, thresholds.statements],
    ['Branches', coverage.total.branches, thresholds.branches],
    ['Functions', coverage.total.functions, thresholds.functions],
    ['Lines', coverage.total.lines, thresholds.lines]
  ];
  const rows = metrics
    .map(([name, data, threshold]) => {
      const pct = Number(data.pct) || 0;
      const status =
        typeof threshold === 'number'
          ? pct >= threshold
            ? '✅'
            : '❌'
          : '';
      return `| ${name} | ${pct.toFixed(2)}% (${data.covered}/${data.total}) | ${
        threshold ?? 'n/a'
      }% | ${status} |`;
    })
    .join('\n');
  const table = `| Metric | Coverage | Threshold | Status |\n| --- | --- | --- | --- |\n${rows}\n`;
  await writeFile('coverage/coverage-comment.md', `### Coverage Summary\n\n${table}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
