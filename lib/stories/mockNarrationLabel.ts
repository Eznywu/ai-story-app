/**
 * The reader shows the test-tone note only when the story API set this flag.
 * A query string, a saved story field, or any non-boolean value stays hidden.
 */
export function mockNarrationLabelVisible(serverFlag: unknown): boolean {
  return serverFlag === true;
}
