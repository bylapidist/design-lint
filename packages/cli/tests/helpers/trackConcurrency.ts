import fs from 'node:fs';

const fsp = fs.promises;
interface FspLike {
  readFile: typeof fsp.readFile;
  stat: typeof fsp.stat;
}
const fspAny: FspLike = fsp;
const origRead = fspAny.readFile;
const origStat = fspAny.stat;
let active = 0;
let max = 0;
const delay = () => new Promise((r) => setTimeout(r, 10));
const trackedRead: typeof origRead = async (...args) => {
  active++;
  max = Math.max(max, active);
  await delay();
  try {
    return await origRead(...args);
  } finally {
    active--;
  }
};
const trackedStat: typeof origStat = async (...args) => {
  active++;
  max = Math.max(max, active);
  await delay();
  try {
    return await origStat(...args);
  } finally {
    active--;
  }
};
fspAny.readFile = trackedRead;
fspAny.stat = trackedStat;
process.on('exit', () => {
  const p = process.env.CONCURRENCY_OUTPUT;
  if (p) fs.writeFileSync(p, String(max), 'utf8');
});
