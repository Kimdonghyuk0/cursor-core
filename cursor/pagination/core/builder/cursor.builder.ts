import type {
  Connection,
  ConnectionBuilder,
  CursorCodec,
  CursorPaginationArgs,
} from '../../common/cursor.interface';
import type { CursorExtractor } from '../../common/cursor.type';
import { ValidationCursorPaginationArgs } from '../validator/cursor.validator';

export class DefaultConnectionBuilder<TNode, TCursor>
  implements ConnectionBuilder<TNode, TCursor> {
  private readonly validator = new ValidationCursorPaginationArgs();

  build(
    nodes: TNode[],
    args: CursorPaginationArgs,
    extractor: CursorExtractor<TNode, TCursor>,
    codec: CursorCodec<TCursor>,
  ): Connection<TNode> {
    // 이 Builder도 직접 사용할 수 있도록 export되어 있으므로 자체 검증을 보장합니다.
    this.validator.validate(args);
    const size = args.first ?? args.last ?? 0;
    const backward = args.last != null;
    const hasExtra = nodes.length > size;

    // 조회 방향에서 가까운 N개를 먼저 남깁니다. 초과 데이터는 항상 배열 끝에 있습니다.
    // last=2, 조회 결과 [5, 4, 3]이면 [5, 4]를 남긴 뒤 [4, 5]로 응답해야 합니다.
    // 먼저 뒤집고 자르면 [3, 4]를 골라 가장 가까운 5번 항목을 누락하게 됩니다.
    const sliced = nodes.slice(0, size);
    if (backward) {
      // slice로 만든 복사본만 뒤집어 DB 조회 결과(원본 배열)는 보존합니다.
      sliced.reverse();
    }

    const edges = sliced.map(node => ({
      node,
      cursor: codec.encode(extractor(node)),
    }));

    return {
      edges,
      pageInfo: {
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges.at(-1)?.cursor ?? null,
        // N+1개 조회로 확인한 방향만 표시합니다. 반대 방향은 추가 조회하지 않습니다.
        hasNextPage: !backward && hasExtra,
        hasPreviousPage: backward && hasExtra,
      },
    };
  }
}
