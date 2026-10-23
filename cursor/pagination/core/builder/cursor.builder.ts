import type {
  Connection,
  ConnectionBuilder,
  CursorCodec,
  CursorPaginationArgs,
} from '../../common/cursor.interface';
import type { CursorExtractor } from '../../common/cursor.type';

export class DefaultConnectionBuilder<TNode, TCursor>
  implements ConnectionBuilder<TNode, TCursor> {

  build(
    nodes: TNode[],
    args: CursorPaginationArgs,
    extractor: CursorExtractor<TNode, TCursor>,
    codec: CursorCodec<TCursor>,
  ): Connection<TNode> {

    const size = args.first ?? args.last ?? 0;

    const hasExtra = nodes.length > size;
    const sliced = hasExtra ? nodes.slice(0, size) : nodes;

    const edges = sliced.map(node => ({
      node,
      cursor: codec.encode(extractor(node)),
    }));

    return {
      edges,
      pageInfo: {
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges.at(-1)?.cursor ?? null,
        hasNextPage: args.first != null ? hasExtra : false,
        hasPreviousPage: args.last != null ? hasExtra : false,
      },
    };
  }
}