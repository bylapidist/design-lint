import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/engine';

test('design-system/component-usage suggests substitutions', async () => {
  const linter = new Linter({
    rules: {
      'design-system/component-usage': [
        'error',
        { substitutions: { button: 'DSButton' } },
      ],
    },
  });
  const res = await linter.lintText('const a = <button/>;', 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('DSButton'));
});

test('design-system/component-usage matches mixed-case tags', async () => {
  const linter = new Linter({
    rules: {
      'design-system/component-usage': [
        'error',
        { substitutions: { button: 'DSButton' } },
      ],
    },
  });
  const res = await linter.lintText('const a = <Button/>;', 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('DSButton'));
});

test('design-system/component-usage matches mixed-case substitution keys', async () => {
  const linter = new Linter({
    rules: {
      'design-system/component-usage': [
        'error',
        { substitutions: { Button: 'DSButton' } },
      ],
    },
  });
  const res = await linter.lintText('const a = <button/>;', 'file.tsx');
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('DSButton'));
});
