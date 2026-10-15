void prepare_batch() {
    open_batch();
    validate_batch();
    begin_batch();
    int batch_limit = configured_limit + retry_count;
    consume_batch(batch_limit);
}
