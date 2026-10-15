void inspect_primary() {
    begin_inspection();
    finish_inspection();
}

void inspect_backup() {
    begin_audit();
    finish_audit();
}

void inspect_archive() {
    open_archive();
    close_archive();
}
