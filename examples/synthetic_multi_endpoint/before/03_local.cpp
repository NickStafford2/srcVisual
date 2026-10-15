void prepare_batch() {
    int batch_limit = configured_limit + retry_count;
    open_batch();
    validate_batch();
    begin_batch();
    consume_batch(batch_limit);
}
