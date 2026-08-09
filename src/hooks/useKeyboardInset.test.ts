import { afterEach, describe, expect, it } from 'vitest';
import { isEditableFocused } from '@/hooks/useKeyboardInset';

describe('isEditableFocused', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.focus?.();
  });

  it('returns false when nothing is focused', () => {
    expect(isEditableFocused()).toBe(false);
  });

  it('returns true for a focused text input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    expect(isEditableFocused()).toBe(true);
  });

  it('returns false for a focused button', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    expect(isEditableFocused()).toBe(false);
  });
});
