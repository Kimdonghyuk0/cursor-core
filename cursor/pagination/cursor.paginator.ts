import type { Connection, ConnectionBuilder, CursorCodec, CursorPaginationArgs } from './common/cursor.interface';
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

  buildConnection(
    nodes: TNode[],
    args: CursorPaginationArgs,
    extractor: CursorExtractor<TNode, TCursor>,
  ): Connection<TNode> {
    return this.connectionBuilder.build(nodes, args, extractor, this.codec);
  }

  encode(cursor: TCursor): string {
    return this.codec.encode(cursor);
  }

  decode(cursor: string): TCursor {
    return this.codec.decode(cursor);
  }

}
