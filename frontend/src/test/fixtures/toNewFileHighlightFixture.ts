import type { VisualizeResponse } from "../../types";

export const toNewFileHighlightFixture = JSON.parse(String.raw`
{
  "source_filename": "pasted.srcdiff.xml",
  "unit_count": 2,
  "has_position_data": true,
  "moved_srcdiff_xml": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<unit xmlns=\"http://www.srcML.org/srcML/src\" xmlns:pos=\"http://www.srcML.org/srcML/position\" xmlns:diff=\"http://www.srcML.org/srcDiff\" xmlns:mv=\"http://www.srcML.org/srcMove\" revision=\"1.0.0\" url=\"/tmp/srcvisual-qiiih5vf/revision_0|/tmp/srcvisual-qiiih5vf/revision_1\" pos:tabs=\"8\">\n\n<unit xmlns:cpp=\"http://www.srcML.org/srcML/cpp\" revision=\"1.0.0\" language=\"C++\" filename=\"main.cpp\" pos:tabs=\"8\"><diff:delete mv:id=\"97b1dcdaf\" mv:to=\"/src:unit[@filename='|foo.hpp']/diff:insert[1]\" type=\"replace\"><function pos:end=\"5:1\" pos:start=\"1:1\"><type pos:end=\"1:3\" pos:start=\"1:1\"><name pos:end=\"1:3\" pos:start=\"1:1\">int</name></type><diff:ws> </diff:ws><name pos:end=\"1:20\" pos:start=\"1:5\">changed_function</name><parameter_list pos:end=\"1:22\" pos:start=\"1:21\">()</parameter_list><diff:ws> </diff:ws><block pos:end=\"5:1\" pos:start=\"1:24\">{<block_content pos:end=\"5:0\" pos:start=\"1:25\"><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"2:14\" pos:start=\"2:3\"><decl pos:end=\"2:13\" pos:start=\"2:3\"><type pos:end=\"2:5\" pos:start=\"2:3\"><name pos:end=\"2:5\" pos:start=\"2:3\">int</name></type><diff:ws> </diff:ws><name pos:end=\"2:7\" pos:start=\"2:7\">x</name><diff:ws> </diff:ws><init pos:end=\"2:13\" pos:start=\"2:9\">=<diff:ws> </diff:ws><expr pos:end=\"2:13\" pos:start=\"2:11\"><literal pos:end=\"2:13\" pos:start=\"2:11\" type=\"number\">123</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"3:14\" pos:start=\"3:3\"><decl pos:end=\"3:13\" pos:start=\"3:3\"><type pos:end=\"3:5\" pos:start=\"3:3\"><name pos:end=\"3:5\" pos:start=\"3:3\">int</name></type><diff:ws> </diff:ws><name pos:end=\"3:7\" pos:start=\"3:7\">y</name><diff:ws> </diff:ws><init pos:end=\"3:13\" pos:start=\"3:9\">=<diff:ws> </diff:ws><expr pos:end=\"3:13\" pos:start=\"3:11\"><literal pos:end=\"3:13\" pos:start=\"3:11\" type=\"number\">456</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><return pos:end=\"4:11\" pos:start=\"4:3\">return<diff:ws> </diff:ws><expr pos:end=\"4:10\" pos:start=\"4:10\"><name pos:end=\"4:10\" pos:start=\"4:10\">x</name></expr>;</return><diff:ws>\n</diff:ws></block_content>}</block></function></diff:delete><diff:insert type=\"replace\"><cpp:include pos:end=\"1:18\" pos:start=\"1:1\">#<cpp:directive pos:end=\"1:8\" pos:start=\"1:2\">include</cpp:directive><diff:ws> </diff:ws><cpp:file pos:end=\"1:18\" pos:start=\"1:10\">\"foo.hpp\"</cpp:file></cpp:include></diff:insert>\n\n<function pos:end=\"10:1|6:1\" pos:start=\"7:1|3:1\"><type pos:end=\"7:3|3:3\" pos:start=\"7:1|3:1\"><name pos:end=\"7:3|3:3\" pos:start=\"7:1|3:1\">int</name></type> <name pos:end=\"7:8|3:8\" pos:start=\"7:5|3:5\">main</name><parameter_list pos:end=\"7:31|3:31\" pos:start=\"7:9|3:9\">(<parameter pos:end=\"7:17|3:17\" pos:start=\"7:10|3:10\"><decl pos:end=\"7:17|3:17\" pos:start=\"7:10|3:10\"><type pos:end=\"7:12|3:12\" pos:start=\"7:10|3:10\"><name pos:end=\"7:12|3:12\" pos:start=\"7:10|3:10\">int</name></type> <name pos:end=\"7:17|3:17\" pos:start=\"7:14|3:14\">argc</name></decl></parameter>, <parameter pos:end=\"7:30|3:30\" pos:start=\"7:20|3:20\"><decl pos:end=\"7:30|3:30\" pos:start=\"7:20|3:20\"><type pos:end=\"7:26|3:26\" pos:start=\"7:20|3:20\"><name pos:end=\"7:23|3:23\" pos:start=\"7:20|3:20\">char</name> <modifier pos:end=\"7:25|3:25\" pos:start=\"7:25|3:25\">*</modifier><modifier pos:end=\"7:26|3:26\" pos:start=\"7:26|3:26\">*</modifier></type><name pos:end=\"7:30|3:30\" pos:start=\"7:27|3:27\">argv</name></decl></parameter>)</parameter_list> <block pos:end=\"10:1|6:1\" pos:start=\"7:33|3:33\">{<block_content pos:end=\"10:0|6:0\" pos:start=\"7:34|3:34\">\n  <decl_stmt pos:end=\"8:29|4:29\" pos:start=\"8:3|4:3\"><decl pos:end=\"8:28|4:28\" pos:start=\"8:3|4:3\"><type pos:end=\"8:5|4:5\" pos:start=\"8:3|4:3\"><name pos:end=\"8:5|4:5\" pos:start=\"8:3|4:3\">int</name></type> <name pos:end=\"8:7|4:7\" pos:start=\"8:7|4:7\">a</name> <init pos:end=\"8:28|4:28\" pos:start=\"8:9|4:9\">= <expr pos:end=\"8:28|4:28\" pos:start=\"8:11|4:11\"><call pos:end=\"8:28|4:28\" pos:start=\"8:11|4:11\"><name pos:end=\"8:26|4:26\" pos:start=\"8:11|4:11\">changed_function</name><argument_list pos:end=\"8:28|4:28\" pos:start=\"8:27|4:27\">()</argument_list></call></expr></init></decl>;</decl_stmt>\n  <return pos:end=\"9:11|5:11\" pos:start=\"9:3|5:3\">return <expr pos:end=\"9:10|5:10\" pos:start=\"9:10|5:10\"><literal pos:end=\"9:10|5:10\" pos:start=\"9:10|5:10\" type=\"number\">1</literal></expr>;</return>\n</block_content>}</block></function>\n</unit>\n\n<unit revision=\"1.0.0\" language=\"C++\" filename=\"|foo.hpp\" pos:tabs=\"8\"><diff:insert mv:from=\"/src:unit[@filename='main.cpp']/diff:delete[1]\" mv:id=\"97b1dcdaf\"><function pos:end=\"5:1\" pos:start=\"1:1\"><type pos:end=\"1:3\" pos:start=\"1:1\"><name pos:end=\"1:3\" pos:start=\"1:1\">int</name></type><diff:ws> </diff:ws><name pos:end=\"1:20\" pos:start=\"1:5\">changed_function</name><parameter_list pos:end=\"1:22\" pos:start=\"1:21\">()</parameter_list><diff:ws> </diff:ws><block pos:end=\"5:1\" pos:start=\"1:24\">{<block_content pos:end=\"5:0\" pos:start=\"1:25\"><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"2:14\" pos:start=\"2:3\"><decl pos:end=\"2:13\" pos:start=\"2:3\"><type pos:end=\"2:5\" pos:start=\"2:3\"><name pos:end=\"2:5\" pos:start=\"2:3\">int</name></type><diff:ws> </diff:ws><name pos:end=\"2:7\" pos:start=\"2:7\">x</name><diff:ws> </diff:ws><init pos:end=\"2:13\" pos:start=\"2:9\">=<diff:ws> </diff:ws><expr pos:end=\"2:13\" pos:start=\"2:11\"><literal pos:end=\"2:13\" pos:start=\"2:11\" type=\"number\">123</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"3:14\" pos:start=\"3:3\"><decl pos:end=\"3:13\" pos:start=\"3:3\"><type pos:end=\"3:5\" pos:start=\"3:3\"><name pos:end=\"3:5\" pos:start=\"3:3\">int</name></type><diff:ws> </diff:ws><name pos:end=\"3:7\" pos:start=\"3:7\">y</name><diff:ws> </diff:ws><init pos:end=\"3:13\" pos:start=\"3:9\">=<diff:ws> </diff:ws><expr pos:end=\"3:13\" pos:start=\"3:11\"><literal pos:end=\"3:13\" pos:start=\"3:11\" type=\"number\">456</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><return pos:end=\"4:11\" pos:start=\"4:3\">return<diff:ws> </diff:ws><expr pos:end=\"4:10\" pos:start=\"4:10\"><name pos:end=\"4:10\" pos:start=\"4:10\">x</name></expr>;</return><diff:ws>\n</diff:ws></block_content>}</block></function><diff:ws>\n</diff:ws></diff:insert></unit>\n\n</unit>\n",
  "move_results": {
    "annotated_regions": 2,
    "candidates_total": 3,
    "groups_total": 2,
    "move_count": 1,
    "moves": [
      {
        "from_node_ids": [
          "/src:unit[1]/diff:delete[1]"
        ],
        "from_raw_texts": [
          "int changed_function() {\n  int x = 123;\n  int y = 456;\n  return x;\n}"
        ],
        "from_xpaths": [
          "/src:unit[1]/diff:delete[1]"
        ],
        "move_id": "97b1dcdaf",
        "to_node_ids": [
          "/src:unit[2]/diff:insert[1]"
        ],
        "to_raw_texts": [
          "int changed_function() {\n  int x = 123;\n  int y = 456;\n  return x;\n}\n"
        ],
        "to_xpaths": [
          "/src:unit[2]/diff:insert[1]"
        ]
      }
    ],
    "regions_total": 3
  },
  "files": [
    {
      "unit_id": 1,
      "filename": "main.cpp",
      "language": "C++",
      "revision_0_source_code": "int changed_function() {\n  int x = 123;\n  int y = 456;\n  return x;\n}\n\nint main(int argc, char **argv) {\n  int a = changed_function();\n  return 1;\n}\n",
      "revision_1_source_code": "#include \"foo.hpp\"\n\nint main(int argc, char **argv) {\n  int a = changed_function();\n  return 1;\n}\n",
      "tree": {
        "id": "/src:unit[1]",
        "path": "/src:unit[1]",
        "tag": "unit",
        "label": "unit: main.cpp",
        "kind": "plain",
        "move_id": null,
        "srcdiff_attributes": {
          "diff": null,
          "move": null,
          "position": null,
          "unit": {
            "filename": "main.cpp",
            "hash": null,
            "language": "C++",
            "revision": "1.0.0",
            "timestamp": null,
            "url": null
          }
        },
        "xml_span": {
          "end_col": 8,
          "end_line": 14,
          "start_col": 1,
          "start_line": 4
        },
        "revision_0_span": {
          "end_col": 1,
          "end_line": 10,
          "start_col": 1,
          "start_line": 1
        },
        "revision_1_span": {
          "end_col": 1,
          "end_line": 6,
          "start_col": 1,
          "start_line": 1
        },
        "children": [
          {
            "id": "/src:unit[1]/diff:delete[1]",
            "path": "/src:unit[1]/diff:delete[1]",
            "tag": "diff:delete",
            "label": "diff:delete",
            "kind": "move",
            "move_id": "97b1dcdaf",
            "srcdiff_attributes": {
              "diff": {
                "revision": null,
                "type": "replace"
              },
              "move": {
                "from_paths": [],
                "id": "97b1dcdaf",
                "to_paths": [
                  "/src:unit[@filename='|foo.hpp']/diff:insert[1]"
                ]
              },
              "position": null,
              "unit": null
            },
            "xml_span": {
              "end_col": 61,
              "end_line": 8,
              "start_col": 115,
              "start_line": 4
            },
            "revision_0_span": {
              "end_col": 1,
              "end_line": 5,
              "start_col": 1,
              "start_line": 1
            },
            "revision_1_span": null,
            "children": []
          }
        ]
      }
    },
    {
      "unit_id": 2,
      "filename": "|foo.hpp",
      "language": "C++",
      "revision_0_source_code": "",
      "revision_1_source_code": "int changed_function() {\n  int x = 123;\n  int y = 456;\n  return x;\n}\n",
      "tree": {
        "id": "/src:unit[2]",
        "path": "/src:unit[2]",
        "tag": "unit",
        "label": "unit: |foo.hpp",
        "kind": "plain",
        "move_id": null,
        "srcdiff_attributes": {
          "diff": null,
          "move": null,
          "position": null,
          "unit": {
            "filename": "|foo.hpp",
            "hash": null,
            "language": "C++",
            "revision": "1.0.0",
            "timestamp": null,
            "url": null
          }
        },
        "xml_span": {
          "end_col": 32,
          "end_line": 21,
          "start_col": 1,
          "start_line": 16
        },
        "revision_0_span": null,
        "revision_1_span": {
          "end_col": 1,
          "end_line": 5,
          "start_col": 1,
          "start_line": 1
        },
        "children": [
          {
            "id": "/src:unit[2]/diff:insert[1]",
            "path": "/src:unit[2]/diff:insert[1]",
            "tag": "diff:insert",
            "label": "diff:insert",
            "kind": "move",
            "move_id": "97b1dcdaf",
            "srcdiff_attributes": {
              "diff": {
                "revision": null,
                "type": null
              },
              "move": {
                "from_paths": [
                  "/src:unit[@filename='main.cpp']/diff:delete[1]"
                ],
                "id": "97b1dcdaf",
                "to_paths": []
              },
              "position": null,
              "unit": null
            },
            "xml_span": {
              "end_col": 25,
              "end_line": 21,
              "start_col": 72,
              "start_line": 16
            },
            "revision_0_span": null,
            "revision_1_span": {
              "end_col": 1,
              "end_line": 5,
              "start_col": 1,
              "start_line": 1
            },
            "children": []
          }
        ]
      }
    }
  ]
}
`) as VisualizeResponse;

export const toNewFileMoveId = "97b1dcdaf";
