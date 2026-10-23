import type { CursorCodec, CursorPaginationArgs } from './common/cursor.interface';
import { Base64CursorCodec } from './core/codec/cursor.codec';
import { ValidationCursorPaginationArgs } from './core/validator/cursor.validator';


export class CursorPaginator<TCursor> {
  private readonly validator = new ValidationCursorPaginationArgs();

  constructor(
    private readonly codec: CursorCodec<TCursor> = new Base64CursorCodec<TCursor>(),
  ) {}

  validate(args: CursorPaginationArgs): boolean {
    return this.validator.validate(args);
  }

  encode(cursor: TCursor): string {
    return this.codec.encode(cursor);
  }

  decode(cursor: string): TCursor {
    return this.codec.decode(cursor);
  }
}
