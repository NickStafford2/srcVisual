void inspect_primary() {
    begin_inspection();
    record_event("checkpoint", session_id, elapsed_ms);
    finish_inspection();
}

void inspect_backup() {
    begin_audit();
    record_event("checkpoint", session_id, elapsed_ms);
    finish_audit();
}

void inspect_archive() {
    open_archive();
    record_event("checkpoint", session_id, elapsed_ms);
    close_archive();
}
