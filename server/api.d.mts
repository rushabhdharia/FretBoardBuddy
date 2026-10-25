export function createApi(dbPath?: string): (req: any, res: any, next: () => void) => Promise<void>
