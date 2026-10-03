/** Turn the API's flat comment array into a tree, tolerating orphans. */
export function buildCommentTree(comments) {
  const nodes = new Map();
  const roots = [];

  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, children: [] });
  }

  for (const node of nodes.values()) {
    const parent = node.parent ? nodes.get(node.parent) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}