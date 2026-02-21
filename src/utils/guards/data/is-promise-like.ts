import { isFunction } from './is-function.js';
import { isObject } from './is-object.js';

/**
 * Checks whether a value has a callable `then` member.
 *
 * @param value - Value to inspect.
 * @returns `true` when value is promise-like.
 */
export const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  isObject(value) && 'then' in value && isFunction(Reflect.get(value, 'then'));
