export interface Finding {
  path: string; // file relative path
  line: number; // target line number (new file)
  message: string; // comment body (may include ```suggestion blocks)
  severity?: string;
  suggestion?: string;
  code?: string;
}
