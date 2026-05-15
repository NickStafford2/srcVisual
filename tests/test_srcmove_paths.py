from srcvisual.srcmove._srcmove_paths import split_srcmove_path_list


def test_split_srcmove_path_list_splits_top_level_union_separator() -> None:
    value = "/src:unit[1]/diff:delete[1]|/src:unit[2]/diff:insert[1]"

    assert split_srcmove_path_list(value) == (
        "/src:unit[1]/diff:delete[1]",
        "/src:unit[2]/diff:insert[1]",
    )


def test_split_srcmove_path_list_keeps_pipe_inside_single_quoted_predicate() -> None:
    value = "/src:unit[@filename='|foo.hpp']/diff:insert[1]"

    assert split_srcmove_path_list(value) == (
        "/src:unit[@filename='|foo.hpp']/diff:insert[1]",
    )


def test_split_srcmove_path_list_keeps_pipe_inside_double_quoted_predicate() -> None:
    value = '/src:unit[@filename="a|b.hpp"]/diff:insert[1]|/src:unit[2]/diff:delete[1]'

    assert split_srcmove_path_list(value) == (
        '/src:unit[@filename="a|b.hpp"]/diff:insert[1]',
        "/src:unit[2]/diff:delete[1]",
    )
