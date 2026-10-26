import type { Connection, ConnectionBuilder, CursorCodec, CursorPaginationArgs, CursorQueryBuilder } from './common/cursor.interface';
import type { CursorExtractor } from './common/cursor.type';
import { DefaultConnectionBuilder } from './core/builder/cursor.builder';
import { Base64CursorCodec } from './core/codec/cursor.codec';
import { ValidationCursorPaginationArgs } from './core/validator/cursor.validator';


export class CursorPaginator<TCursor, TNode = unknown> {
  private readonly validator = new ValidationCursorPaginationArgs();

  constructor(
    private readonly codec: CursorCodec<TCursor> = new Base64CursorCodec<TCursor>(),
    private readonly connectionBuilder: ConnectionBuilder<TNode, TCursor>
      = new DefaultConnectionBuilder<TNode, TCursor>(),
  ) {}

  validate(args: CursorPaginationArgs): boolean {
    return this.validator.validate(args);
  }

  // 조회 조건을 만들기 전에 검증하므로, 잘못된 요청은 DB 호출까지 도달하지 않습니다. 
  buildQuery<TQuery>(args: CursorPaginationArgs, queryBuilder: CursorQueryBuilder<TCursor, TQuery>): TQuery {
    this.validate(args);
    const encodedCursor = args.after ?? args.before;
    const cursor = encodedCursor == null ? null : this.decode(encodedCursor);
    return queryBuilder.build(args, cursor);
  }

  buildConnection(
    nodes: TNode[],
    args: CursorPaginationArgs,
    extractor: CursorExtractor<TNode, TCursor>,
  ): Connection<TNode> {
    // 별도로 호출하거나 사용자 정의 Builder를 주입해도 요청 검증을 건너뛸 수 없습니다.
    this.validate(args);
    return this.connectionBuilder.build(nodes, args, extractor, this.codec);
  }

  encode(cursor: TCursor): string {
    return this.codec.encode(cursor);
  }

  decode(cursor: string): TCursor {
    return this.codec.decode(cursor);
  }

}
