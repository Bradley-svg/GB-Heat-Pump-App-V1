'use strict';

function isNode(value) {
  return value && typeof value.type === 'string';
}

function getChildNodes(node) {
  const children = [];
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const value = node[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          children.push(item);
        }
      }
    } else if (isNode(value)) {
      children.push(value);
    }
  }
  return children;
}

function traverse(node, callback, ancestors = [], depth = 0) {
  if (!isNode(node)) return;
  ancestors.push(node);
  callback(node, ancestors, depth);
  for (const child of getChildNodes(node)) {
    traverse(child, callback, ancestors, depth + 1);
  }
  ancestors.pop();
}

function ancestor(root, visitors = {}, _base, state) {
  traverse(root, (node, ancestors) => {
    const handler = visitors[node.type] || visitors['*'];
    if (typeof handler === 'function') {
      handler(node, state, ancestors.slice());
    }
  });
}

function findNodeAround(root, position, test) {
  const predicate = typeof test === 'function'
    ? test
    : (node) => node && node.type === test;
  let best = null;
  traverse(root, (node, ancestors, depth) => {
    if (typeof node.start !== 'number' || typeof node.end !== 'number') {
      return;
    }
    if (node.start <= position && position <= node.end && predicate(node, ancestors)) {
      if (!best || depth >= best.depth) {
        best = {
          node,
          depth,
          path: ancestors.slice(),
          ancestors: ancestors.slice(0, -1)
        };
      }
    }
  });
  if (!best) return undefined;
  return { node: best.node, path: best.path, ancestors: best.ancestors };
}

module.exports = {
  ancestor,
  findNodeAround
};
