/**
 * The library (§3.13): a writer opts an ended Duel in, and its counts join the
 * public library. Only the counts ever leave; the answers were already decided
 * at close (D34). Opt-in is one conditional write, nothing more.
 */

export interface OptIn {
  PK: string
  SK: 'META'
}

export interface OptInCommand {
  TableName: string
  Key: OptIn
  UpdateExpression: string
  ConditionExpression: string
  ExpressionAttributeNames: Record<string, string>
  ExpressionAttributeValues: Record<string, string>
}

export class LibraryError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Ended Duels only: an open Duel has no result to share, and the plan forbids
 * peeking (D34). The owner key is the permission; the caller compares hashes.
 */
export function optInLibrary(table: string, duelId: string): OptInCommand {
  if (!duelId) throw new LibraryError(400, 'Missing Duel id.')
  return {
    TableName: table,
    Key: { PK: `DUEL#${duelId}`, SK: 'META' },
    UpdateExpression: 'SET in_library = :t',
    ConditionExpression: 'attribute_exists(PK) AND #status = :ended',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':t': 'true', ':ended': 'ENDED' },
  }
}

/** 403 for a wrong key, 404 for a missing Duel, 409 for one that hasn't ended. */
export function optInFailure(error: unknown): LibraryError {
  const name = (error as { name?: string })?.name
  if (name === 'ConditionalCheckFailedException') {
    return new LibraryError(409, 'This Duel has not ended yet.')
  }
  return new LibraryError(503, 'Could not add this Duel to the library. Try again.')
}
