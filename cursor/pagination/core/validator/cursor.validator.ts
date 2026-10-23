import type { CursorPaginationArgs } from '../../common/cursor.interface';

class ValidationCursorPaginationArgs {
  validate(args: CursorPaginationArgs): boolean {
    const { first, after, last, before } = args;

    // first / last 둘 다 없으면 잘못된 요청
    if (first == null && last == null) {
      throw new Error('first 또는 last 중 하나는 필요합니다.');
    }

    // 둘 다 있으면 안 됨
    if (first != null && last != null) {
      throw new Error('first와 last는 동시에 사용할 수 없습니다.');
    }

    // forward pagination
    if (first != null) {
      if (first <= 0) {
        throw new Error('first는 1 이상이어야 합니다.');
      }

      if (before != null) {
        throw new Error('first와 before는 함께 사용할 수 없습니다.');
      }
    }

    // backward pagination
    if (last != null) {
      if (last <= 0) {
        throw new Error('last는 1 이상이어야 합니다.');
      }

      if (after != null) {
        throw new Error('last와 after는 함께 사용할 수 없습니다.');
      }
    }

    return true;
  }
}

