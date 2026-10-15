void process_primary() {
    begin_primary();
    record_event("checkpoint", session_id, elapsed_ms);
    finish_primary();
}

void process_backup() {
    begin_backup();
    record_event("checkpoint", session_id, elapsed_ms);
    finish_backup();
}
