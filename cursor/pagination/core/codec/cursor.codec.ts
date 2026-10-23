import type { CursorCodec,CursorPaginationArgs,Connection,Edge } from '../../common/cursor.interface';

class Base64CursorCodec<TCursor> implements CursorCodec<TCursor> {
  encode(cursor: TCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
  }

  decode(cursor: string): TCursor {
    return JSON.parse(
      Buffer.from(cursor, 'base64').toString('utf8'),
    );
  }

}



