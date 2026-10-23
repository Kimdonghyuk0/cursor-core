export type CursorExtractor<TNode, TCursor> =
  (node: TNode) => TCursor;