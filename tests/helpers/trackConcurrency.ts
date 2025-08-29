import fs from 'node:fs';

const fsp = fs.promises;
const fspAny = fsp as {
  readFile: typeof fsp.readFile;
  stat: typeof fsp.stat;
};
const origRead = fspAny.readFile;
const origStat = fspAny.stat;
let active = 0;
let max = 0;
const delay = () => new Promise((r) => setTimeout(r, 10));
fspAny.readFile = (async (...args: Parameters<typeof origRead>) => {
  active++;
  max = Math.max(max, active);
  await delay();
  try {
    return await origRead(...args);
  } finally {
    active--;
  }
}) as typeof origRead;
fspAny.stat = (async (...args: Parameters<typeof origStat>) => {
  active++;
  max = Math.max(max, active);
  await delay();
  try {
    return await origStat(...args);
  } finally {
    active--;
  }
}) as typeof origStat;
process.on('exit', () => {
  const p = process.env.CONCURRENCY_OUTPUT;
  if (p) fs.writeFileSync(p, String(max), 'utf8');
});
