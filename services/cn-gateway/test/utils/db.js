export function truncateAll() {
    const mem = globalThis.__PG_MEM__;
    if (!mem) {
        throw new Error("pg-mem not initialized");
    }
    mem.public.none(`
    TRUNCATE TABLE mapping RESTART IDENTITY;
    TRUNCATE TABLE audit_log RESTART IDENTITY;
    TRUNCATE TABLE export_log RESTART IDENTITY;
    TRUNCATE TABLE errors RESTART IDENTITY;
  `);
}
//# sourceMappingURL=db.js.map