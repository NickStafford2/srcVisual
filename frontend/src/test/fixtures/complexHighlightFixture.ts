import type { VisualizeResponse } from "../../types";

export const complexHighlightFixture = JSON.parse(String.raw`
{
  "source_filename": "pasted.srcdiff.xml",
  "unit_count": 5,
  "has_position_data": true,
  "moved_srcdiff_xml": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<unit xmlns=\"http://www.srcML.org/srcML/src\" xmlns:pos=\"http://www.srcML.org/srcML/position\" xmlns:diff=\"http://www.srcML.org/srcDiff\" xmlns:mv=\"http://www.srcML.org/srcMove\" revision=\"1.0.0\" url=\"/tmp/srcvisual-d9f0eb4t/revision_0|/tmp/srcvisual-d9f0eb4t/revision_1\" pos:tabs=\"8\">\n\n<unit revision=\"1.0.0\" language=\"C++\" filename=\"bar.cpp\" pos:tabs=\"8\"><diff:insert mv:from=\"/src:unit[@filename='foo.cpp']/diff:delete[1]\" mv:id=\"c89025cc1\"><function pos:end=\"6:1\" pos:start=\"1:1\"><type pos:end=\"1:4\" pos:start=\"1:1\"><name pos:end=\"1:4\" pos:start=\"1:1\">char</name></type><diff:ws> </diff:ws><name pos:end=\"1:21\" pos:start=\"1:6\">definition_moved</name><parameter_list pos:end=\"1:23\" pos:start=\"1:22\">()</parameter_list><diff:ws> </diff:ws><block pos:end=\"6:1\" pos:start=\"1:25\">{<block_content pos:end=\"6:0\" pos:start=\"1:26\"><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"2:15\" pos:start=\"2:3\"><decl pos:end=\"2:14\" pos:start=\"2:3\"><type pos:end=\"2:6\" pos:start=\"2:3\"><name pos:end=\"2:6\" pos:start=\"2:3\">char</name></type><diff:ws> </diff:ws><name pos:end=\"2:8\" pos:start=\"2:8\">d</name><diff:ws> </diff:ws><init pos:end=\"2:14\" pos:start=\"2:10\">=<diff:ws> </diff:ws><expr pos:end=\"2:14\" pos:start=\"2:12\"><literal pos:end=\"2:14\" pos:start=\"2:12\" type=\"char\">'d'</literal></expr></init></decl>;</decl_stmt><diff:ws>\n\n  </diff:ws><decl_stmt pos:end=\"4:15\" pos:start=\"4:3\"><decl pos:end=\"4:14\" pos:start=\"4:3\"><type pos:end=\"4:6\" pos:start=\"4:3\"><name pos:end=\"4:6\" pos:start=\"4:3\">char</name></type><diff:ws> </diff:ws><name pos:end=\"4:8\" pos:start=\"4:8\">e</name><diff:ws> </diff:ws><init pos:end=\"4:14\" pos:start=\"4:10\">=<diff:ws> </diff:ws><expr pos:end=\"4:14\" pos:start=\"4:12\"><literal pos:end=\"4:14\" pos:start=\"4:12\" type=\"char\">'e'</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><return pos:end=\"5:15\" pos:start=\"5:3\">return<diff:ws> </diff:ws><expr pos:end=\"5:14\" pos:start=\"5:10\"><name pos:end=\"5:10\" pos:start=\"5:10\">d</name><diff:ws> </diff:ws><operator pos:end=\"5:12\" pos:start=\"5:12\">+</operator><diff:ws> </diff:ws><name pos:end=\"5:14\" pos:start=\"5:14\">e</name></expr>;</return><diff:ws>\n</diff:ws></block_content>}</block></function></diff:insert>\n<diff:insert><diff:ws>\n</diff:ws></diff:insert><function pos:end=\"2:39|8:39\" pos:start=\"2:1|8:1\"><type pos:end=\"2:4|8:4\" pos:start=\"2:1|8:1\"><name pos:end=\"2:4|8:4\" pos:start=\"2:1|8:1\">char</name></type> <name pos:end=\"2:21|8:21\" pos:start=\"2:6|8:6\">coppied_function</name><parameter_list pos:end=\"2:23|8:23\" pos:start=\"2:22|8:22\">()</parameter_list> <block pos:end=\"2:39|8:39\" pos:start=\"2:25|8:25\">{<block_content pos:end=\"2:38|8:38\" pos:start=\"2:26|8:26\"> <return pos:end=\"2:37|8:37\" pos:start=\"2:27|8:27\">return <expr pos:end=\"2:36|8:36\" pos:start=\"2:34|8:34\"><literal pos:end=\"2:36|8:36\" pos:start=\"2:34|8:34\" type=\"char\">'a'</literal></expr>;</return> </block_content>}</block></function>\n</unit>\n\n<unit revision=\"1.0.0\" language=\"C++\" filename=\"bar.hpp\" pos:tabs=\"8\"><diff:insert mv:from=\"/src:unit[@filename='foo.hpp']/diff:delete[2]\" mv:id=\"97b1dcdaf\"><function_decl pos:end=\"1:25\" pos:start=\"1:1\"><type pos:end=\"1:4\" pos:start=\"1:1\"><name pos:end=\"1:4\" pos:start=\"1:1\">char</name></type><diff:ws> </diff:ws><name pos:end=\"1:22\" pos:start=\"1:6\">delcaration_moved</name><parameter_list pos:end=\"1:24\" pos:start=\"1:23\">()</parameter_list>;</function_decl><diff:ws>\n</diff:ws></diff:insert></unit>\n\n<unit xmlns:cpp=\"http://www.srcML.org/srcML/cpp\" revision=\"1.0.0\" language=\"C++\" filename=\"foo.cpp\" pos:tabs=\"8\"><cpp:include pos:end=\"1:18\" pos:start=\"1:1\">#<cpp:directive pos:end=\"1:8\" pos:start=\"1:2\">include</cpp:directive> <cpp:file pos:end=\"1:18\" pos:start=\"1:10\">\"foo.hpp\"</cpp:file></cpp:include>\n\n<diff:insert><function pos:end=\"3:39\" pos:start=\"3:1\"><type pos:end=\"3:4\" pos:start=\"3:1\"><name pos:end=\"3:4\" pos:start=\"3:1\">char</name></type><diff:ws> </diff:ws><name pos:end=\"3:21\" pos:start=\"3:6\">coppied_function</name><parameter_list pos:end=\"3:23\" pos:start=\"3:22\">()</parameter_list><diff:ws> </diff:ws><block pos:end=\"3:39\" pos:start=\"3:25\">{<block_content pos:end=\"3:38\" pos:start=\"3:26\"><diff:ws> </diff:ws><return pos:end=\"3:37\" pos:start=\"3:27\">return<diff:ws> </diff:ws><expr pos:end=\"3:36\" pos:start=\"3:34\"><literal pos:end=\"3:36\" pos:start=\"3:34\" type=\"char\">'a'</literal></expr>;</return><diff:ws> </diff:ws></block_content>}</block></function><diff:ws>\n\n</diff:ws><function pos:end=\"9:1\" pos:start=\"5:1\"><type pos:end=\"5:3\" pos:start=\"5:1\"><name pos:end=\"5:3\" pos:start=\"5:1\">int</name></type><diff:ws> </diff:ws><name pos:end=\"5:20\" pos:start=\"5:5\">changed_function</name><parameter_list pos:end=\"5:22\" pos:start=\"5:21\">()</parameter_list><diff:ws> </diff:ws><block pos:end=\"9:1\" pos:start=\"5:24\">{<block_content pos:end=\"9:0\" pos:start=\"5:25\"><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"6:14\" pos:start=\"6:3\"><decl pos:end=\"6:13\" pos:start=\"6:3\"><type pos:end=\"6:5\" pos:start=\"6:3\"><name pos:end=\"6:5\" pos:start=\"6:3\">int</name></type><diff:ws> </diff:ws><name pos:end=\"6:7\" pos:start=\"6:7\">x</name><diff:ws> </diff:ws><init pos:end=\"6:13\" pos:start=\"6:9\">=<diff:ws> </diff:ws><expr pos:end=\"6:13\" pos:start=\"6:11\"><literal pos:end=\"6:13\" pos:start=\"6:11\" type=\"number\">123</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"7:14\" pos:start=\"7:3\"><decl pos:end=\"7:13\" pos:start=\"7:3\"><type pos:end=\"7:5\" pos:start=\"7:3\"><name pos:end=\"7:5\" pos:start=\"7:3\">int</name></type><diff:ws> </diff:ws><name pos:end=\"7:7\" pos:start=\"7:7\">y</name><diff:ws> </diff:ws><init pos:end=\"7:13\" pos:start=\"7:9\">=<diff:ws> </diff:ws><expr pos:end=\"7:13\" pos:start=\"7:11\"><literal pos:end=\"7:13\" pos:start=\"7:11\" type=\"number\">456</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><return pos:end=\"8:11\" pos:start=\"8:3\">return<diff:ws> </diff:ws><expr pos:end=\"8:10\" pos:start=\"8:10\"><name pos:end=\"8:10\" pos:start=\"8:10\">x</name></expr>;</return><diff:ws>\n</diff:ws></block_content>}</block></function><diff:ws>\n\n</diff:ws></diff:insert><function pos:end=\"8:1|16:1\" pos:start=\"3:1|11:1\"><type pos:end=\"3:4|11:4\" pos:start=\"3:1|11:1\"><name pos:end=\"3:4|11:4\" pos:start=\"3:1|11:1\">char</name></type> <name pos:end=\"3:23|11:23\" pos:start=\"3:6|11:6\">unchanged_function</name><parameter_list pos:end=\"3:25|11:25\" pos:start=\"3:24|11:24\">()</parameter_list> <block pos:end=\"8:1|16:1\" pos:start=\"3:27|11:27\">{<block_content pos:end=\"8:0|16:0\" pos:start=\"3:28|11:28\">\n  <decl_stmt pos:end=\"4:15|12:15\" pos:start=\"4:3|12:3\"><decl pos:end=\"4:14|12:14\" pos:start=\"4:3|12:3\"><type pos:end=\"4:6|12:6\" pos:start=\"4:3|12:3\"><name pos:end=\"4:6|12:6\" pos:start=\"4:3|12:3\">char</name></type> <name pos:end=\"4:8|12:8\" pos:start=\"4:8|12:8\">a</name> <init pos:end=\"4:14|12:14\" pos:start=\"4:10|12:10\">= <expr pos:end=\"4:14|12:14\" pos:start=\"4:12|12:12\"><literal pos:end=\"4:14|12:14\" pos:start=\"4:12|12:12\" type=\"char\">'a'</literal></expr></init></decl>;</decl_stmt>\n  <decl_stmt pos:end=\"5:15|13:15\" pos:start=\"5:3|13:3\"><decl pos:end=\"5:14|13:14\" pos:start=\"5:3|13:3\"><type pos:end=\"5:6|13:6\" pos:start=\"5:3|13:3\"><name pos:end=\"5:6|13:6\" pos:start=\"5:3|13:3\">char</name></type> <name pos:end=\"5:8|13:8\" pos:start=\"5:8|13:8\">b</name> <init pos:end=\"5:14|13:14\" pos:start=\"5:10|13:10\">= <expr pos:end=\"5:14|13:14\" pos:start=\"5:12|13:12\"><literal pos:end=\"5:14|13:14\" pos:start=\"5:12|13:12\" type=\"char\">'b'</literal></expr></init></decl>;</decl_stmt>\n  <decl_stmt pos:end=\"6:15|14:15\" pos:start=\"6:3|14:3\"><decl pos:end=\"6:14|14:14\" pos:start=\"6:3|14:3\"><type pos:end=\"6:6|14:6\" pos:start=\"6:3|14:3\"><name pos:end=\"6:6|14:6\" pos:start=\"6:3|14:3\">char</name></type> <name pos:end=\"6:8|14:8\" pos:start=\"6:8|14:8\">c</name> <init pos:end=\"6:14|14:14\" pos:start=\"6:10|14:10\">= <expr pos:end=\"6:14|14:14\" pos:start=\"6:12|14:12\"><literal pos:end=\"6:14|14:14\" pos:start=\"6:12|14:12\" type=\"char\">'c'</literal></expr></init></decl>;</decl_stmt>\n  <return pos:end=\"7:19|15:19\" pos:start=\"7:3|15:3\">return <expr pos:end=\"7:18|15:18\" pos:start=\"7:10|15:10\"><name pos:end=\"7:10|15:10\" pos:start=\"7:10|15:10\">a</name> <operator pos:end=\"7:12|15:12\" pos:start=\"7:12|15:12\">+</operator> <name pos:end=\"7:14|15:14\" pos:start=\"7:14|15:14\">b</name> <operator pos:end=\"7:16|15:16\" pos:start=\"7:16|15:16\">+</operator> <name pos:end=\"7:18|15:18\" pos:start=\"7:18|15:18\">c</name></expr>;</return>\n</block_content>}</block></function>\n<diff:delete mv:id=\"c89025cc1\" mv:to=\"/src:unit[@filename='bar.cpp']/diff:insert[1]\"><diff:ws>\n</diff:ws><function pos:end=\"14:1\" pos:start=\"10:1\"><type pos:end=\"10:4\" pos:start=\"10:1\"><name pos:end=\"10:4\" pos:start=\"10:1\">char</name></type><diff:ws> </diff:ws><name pos:end=\"10:21\" pos:start=\"10:6\">definition_moved</name><parameter_list pos:end=\"10:23\" pos:start=\"10:22\">()</parameter_list><diff:ws> </diff:ws><block pos:end=\"14:1\" pos:start=\"10:25\">{<block_content pos:end=\"14:0\" pos:start=\"10:26\"><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"11:15\" pos:start=\"11:3\"><decl pos:end=\"11:14\" pos:start=\"11:3\"><type pos:end=\"11:6\" pos:start=\"11:3\"><name pos:end=\"11:6\" pos:start=\"11:3\">char</name></type><diff:ws> </diff:ws><name pos:end=\"11:8\" pos:start=\"11:8\">d</name><diff:ws> </diff:ws><init pos:end=\"11:14\" pos:start=\"11:10\">=<diff:ws> </diff:ws><expr pos:end=\"11:14\" pos:start=\"11:12\"><literal pos:end=\"11:14\" pos:start=\"11:12\" type=\"char\">'d'</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"12:15\" pos:start=\"12:3\"><decl pos:end=\"12:14\" pos:start=\"12:3\"><type pos:end=\"12:6\" pos:start=\"12:3\"><name pos:end=\"12:6\" pos:start=\"12:3\">char</name></type><diff:ws> </diff:ws><name pos:end=\"12:8\" pos:start=\"12:8\">e</name><diff:ws> </diff:ws><init pos:end=\"12:14\" pos:start=\"12:10\">=<diff:ws> </diff:ws><expr pos:end=\"12:14\" pos:start=\"12:12\"><literal pos:end=\"12:14\" pos:start=\"12:12\" type=\"char\">'e'</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><return pos:end=\"13:15\" pos:start=\"13:3\">return<diff:ws> </diff:ws><expr pos:end=\"13:14\" pos:start=\"13:10\"><name pos:end=\"13:10\" pos:start=\"13:10\">d</name><diff:ws> </diff:ws><operator pos:end=\"13:12\" pos:start=\"13:12\">+</operator><diff:ws> </diff:ws><name pos:end=\"13:14\" pos:start=\"13:14\">e</name></expr>;</return><diff:ws>\n</diff:ws></block_content>}</block></function><diff:ws>\n</diff:ws></diff:delete></unit>\n\n<unit revision=\"1.0.0\" language=\"C++\" filename=\"foo.hpp\" pos:tabs=\"8\"><comment pos:end=\"1:78\" pos:start=\"1:1\" type=\"line\">// This currently can not be captured because srcdiff deletes the function tag</comment>\n<comment pos:end=\"2:21\" pos:start=\"2:1\" type=\"line\">// and not the block.</comment>\n<diff:delete type=\"replace\"><function pos:end=\"7:1\" pos:start=\"3:1\"><type pos:end=\"3:3\" pos:start=\"3:1\"><name pos:end=\"3:3\" pos:start=\"3:1\">int</name></type><diff:ws> </diff:ws><name pos:end=\"3:20\" pos:start=\"3:5\">changed_function</name><parameter_list pos:end=\"3:22\" pos:start=\"3:21\">()</parameter_list><diff:ws> </diff:ws><block pos:end=\"7:1\" pos:start=\"3:24\">{<block_content pos:end=\"7:0\" pos:start=\"3:25\"><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"4:14\" pos:start=\"4:3\"><decl pos:end=\"4:13\" pos:start=\"4:3\"><type pos:end=\"4:5\" pos:start=\"4:3\"><name pos:end=\"4:5\" pos:start=\"4:3\">int</name></type><diff:ws> </diff:ws><name pos:end=\"4:7\" pos:start=\"4:7\">x</name><diff:ws> </diff:ws><init pos:end=\"4:13\" pos:start=\"4:9\">=<diff:ws> </diff:ws><expr pos:end=\"4:13\" pos:start=\"4:11\"><literal pos:end=\"4:13\" pos:start=\"4:11\" type=\"number\">123</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><decl_stmt pos:end=\"5:14\" pos:start=\"5:3\"><decl pos:end=\"5:13\" pos:start=\"5:3\"><type pos:end=\"5:5\" pos:start=\"5:3\"><name pos:end=\"5:5\" pos:start=\"5:3\">int</name></type><diff:ws> </diff:ws><name pos:end=\"5:7\" pos:start=\"5:7\">y</name><diff:ws> </diff:ws><init pos:end=\"5:13\" pos:start=\"5:9\">=<diff:ws> </diff:ws><expr pos:end=\"5:13\" pos:start=\"5:11\"><literal pos:end=\"5:13\" pos:start=\"5:11\" type=\"number\">456</literal></expr></init></decl>;</decl_stmt><diff:ws>\n  </diff:ws><return pos:end=\"6:11\" pos:start=\"6:3\">return<diff:ws> </diff:ws><expr pos:end=\"6:10\" pos:start=\"6:10\"><name pos:end=\"6:10\" pos:start=\"6:10\">x</name></expr>;</return><diff:ws>\n</diff:ws></block_content>}</block></function><diff:ws>\n\n</diff:ws><function pos:end=\"9:39\" pos:start=\"9:1\"><type pos:end=\"9:4\" pos:start=\"9:1\"><name pos:end=\"9:4\" pos:start=\"9:1\">char</name></type><diff:ws> </diff:ws><name pos:end=\"9:21\" pos:start=\"9:6\">coppied_function</name><parameter_list pos:end=\"9:23\" pos:start=\"9:22\">()</parameter_list><diff:ws> </diff:ws><block pos:end=\"9:39\" pos:start=\"9:25\">{<block_content pos:end=\"9:38\" pos:start=\"9:26\"><diff:ws> </diff:ws><return pos:end=\"9:37\" pos:start=\"9:27\">return<diff:ws> </diff:ws><expr pos:end=\"9:36\" pos:start=\"9:34\"><literal pos:end=\"9:36\" pos:start=\"9:34\" type=\"char\">'a'</literal></expr>;</return><diff:ws> </diff:ws></block_content>}</block></function></diff:delete><diff:insert type=\"replace\"><function_decl pos:end=\"3:23\" pos:start=\"3:1\"><type pos:end=\"3:3\" pos:start=\"3:1\"><name pos:end=\"3:3\" pos:start=\"3:1\">int</name></type><diff:ws> </diff:ws><name pos:end=\"3:20\" pos:start=\"3:5\">changed_function</name><parameter_list pos:end=\"3:22\" pos:start=\"3:21\">()</parameter_list>;</function_decl></diff:insert>\n\n<function_decl pos:end=\"11:26|5:26\" pos:start=\"11:1|5:1\"><type pos:end=\"11:4|5:4\" pos:start=\"11:1|5:1\"><name pos:end=\"11:4|5:4\" pos:start=\"11:1|5:1\">char</name></type> <name pos:end=\"11:23|5:23\" pos:start=\"11:6|5:6\">unchanged_function</name><parameter_list pos:end=\"11:25|5:25\" pos:start=\"11:24|5:24\">()</parameter_list>;</function_decl>\n<diff:delete mv:id=\"97b1dcdaf\" mv:to=\"/src:unit[@filename='bar.hpp']/diff:insert[1]\"><function_decl pos:end=\"12:25\" pos:start=\"12:1\"><type pos:end=\"12:4\" pos:start=\"12:1\"><name pos:end=\"12:4\" pos:start=\"12:1\">char</name></type><diff:ws> </diff:ws><name pos:end=\"12:22\" pos:start=\"12:6\">delcaration_moved</name><parameter_list pos:end=\"12:24\" pos:start=\"12:23\">()</parameter_list>;</function_decl><diff:ws>\n</diff:ws></diff:delete></unit>\n\n<unit xmlns:cpp=\"http://www.srcML.org/srcML/cpp\" revision=\"1.0.0\" language=\"C++\" filename=\"main.cpp\" pos:tabs=\"8\"><cpp:empty pos:end=\"1:17\" pos:start=\"1:1\">#import \"foo.hpp\"</cpp:empty>\n\n<diff:delete><function pos:end=\"3:39\" pos:start=\"3:1\"><type pos:end=\"3:4\" pos:start=\"3:1\"><name pos:end=\"3:4\" pos:start=\"3:1\">char</name></type><diff:ws> </diff:ws><name pos:end=\"3:21\" pos:start=\"3:6\">coppied_function</name><parameter_list pos:end=\"3:23\" pos:start=\"3:22\">()</parameter_list><diff:ws> </diff:ws><block pos:end=\"3:39\" pos:start=\"3:25\">{<block_content pos:end=\"3:38\" pos:start=\"3:26\"><diff:ws> </diff:ws><return pos:end=\"3:37\" pos:start=\"3:27\">return<diff:ws> </diff:ws><expr pos:end=\"3:36\" pos:start=\"3:34\"><literal pos:end=\"3:36\" pos:start=\"3:34\" type=\"char\">'a'</literal></expr>;</return><diff:ws> </diff:ws></block_content>}</block></function><diff:ws>\n\n</diff:ws></diff:delete><function pos:end=\"9:1|7:1\" pos:start=\"5:1|3:1\"><type pos:end=\"5:3|3:3\" pos:start=\"5:1|3:1\"><name pos:end=\"5:3|3:3\" pos:start=\"5:1|3:1\">int</name></type> <name pos:end=\"5:8|3:8\" pos:start=\"5:5|3:5\">main</name><parameter_list pos:end=\"5:31|3:31\" pos:start=\"5:9|3:9\">(<parameter pos:end=\"5:17|3:17\" pos:start=\"5:10|3:10\"><decl pos:end=\"5:17|3:17\" pos:start=\"5:10|3:10\"><type pos:end=\"5:12|3:12\" pos:start=\"5:10|3:10\"><name pos:end=\"5:12|3:12\" pos:start=\"5:10|3:10\">int</name></type> <name pos:end=\"5:17|3:17\" pos:start=\"5:14|3:14\">argc</name></decl></parameter>, <parameter pos:end=\"5:30|3:30\" pos:start=\"5:20|3:20\"><decl pos:end=\"5:30|3:30\" pos:start=\"5:20|3:20\"><type pos:end=\"5:26|3:26\" pos:start=\"5:20|3:20\"><name pos:end=\"5:23|3:23\" pos:start=\"5:20|3:20\">char</name> <modifier pos:end=\"5:25|3:25\" pos:start=\"5:25|3:25\">*</modifier><modifier pos:end=\"5:26|3:26\" pos:start=\"5:26|3:26\">*</modifier></type><name pos:end=\"5:30|3:30\" pos:start=\"5:27|3:27\">argv</name></decl></parameter>)</parameter_list> <block pos:end=\"9:1|7:1\" pos:start=\"5:33|3:33\">{<block_content pos:end=\"9:0|7:0\" pos:start=\"5:34|3:34\">\n  <decl_stmt pos:end=\"6:30|4:30\" pos:start=\"6:3|4:3\"><decl pos:end=\"6:29|4:29\" pos:start=\"6:3|4:3\"><type pos:end=\"6:5|4:5\" pos:start=\"6:3|4:3\"><name pos:end=\"6:5|4:5\" pos:start=\"6:3|4:3\">int</name></type>  <name pos:end=\"6:8|4:8\" pos:start=\"6:8|4:8\">a</name> <init pos:end=\"6:29|4:29\" pos:start=\"6:10|4:10\">= <expr pos:end=\"6:29|4:29\" pos:start=\"6:12|4:12\"><call pos:end=\"6:29|4:29\" pos:start=\"6:12|4:12\"><name pos:end=\"6:27|4:27\" pos:start=\"6:12|4:12\">changed_function</name><argument_list pos:end=\"6:29|4:29\" pos:start=\"6:28|4:28\">()</argument_list></call></expr></init></decl>;</decl_stmt>\n  <decl_stmt pos:end=\"7:32|5:32\" pos:start=\"7:3|5:3\"><decl pos:end=\"7:31|5:31\" pos:start=\"7:3|5:3\"><type pos:end=\"7:6|5:6\" pos:start=\"7:3|5:3\"><name pos:end=\"7:6|5:6\" pos:start=\"7:3|5:3\">char</name></type> <name pos:end=\"7:8|5:8\" pos:start=\"7:8|5:8\">c</name> <init pos:end=\"7:31|5:31\" pos:start=\"7:10|5:10\">= <expr pos:end=\"7:31|5:31\" pos:start=\"7:12|5:12\"><call pos:end=\"7:31|5:31\" pos:start=\"7:12|5:12\"><name pos:end=\"7:29|5:29\" pos:start=\"7:12|5:12\">unchanged_function</name><argument_list pos:end=\"7:31|5:31\" pos:start=\"7:30|5:30\">()</argument_list></call></expr></init></decl>;</decl_stmt>\n  <return pos:end=\"8:11|6:11\" pos:start=\"8:3|6:3\">return <expr pos:end=\"8:10|6:10\" pos:start=\"8:10|6:10\"><literal pos:end=\"8:10|6:10\" pos:start=\"8:10|6:10\" type=\"number\">1</literal></expr>;</return>\n</block_content>}</block></function>\n</unit>\n\n</unit>\n",
  "move_results": {
    "annotated_regions": 4,
    "candidates_total": 8,
    "groups_total": 6,
    "move_count": 2,
    "moves": [
      {
        "from_node_ids": [
          "/src:unit[4]/diff:delete[2]"
        ],
        "from_raw_texts": [
          "char delcaration_moved();\n"
        ],
        "from_xpaths": [
          "/src:unit[4]/diff:delete[2]"
        ],
        "move_id": "97b1dcdaf",
        "to_node_ids": [
          "/src:unit[2]/diff:insert[1]"
        ],
        "to_raw_texts": [
          "char delcaration_moved();\n"
        ],
        "to_xpaths": [
          "/src:unit[2]/diff:insert[1]"
        ]
      },
      {
        "from_node_ids": [
          "/src:unit[3]/diff:delete[1]"
        ],
        "from_raw_texts": [
          "\nchar definition_moved() {\n  char d = 'd';\n  char e = 'e';\n  return d + e;\n}\n"
        ],
        "from_xpaths": [
          "/src:unit[3]/diff:delete[1]"
        ],
        "move_id": "c89025cc1",
        "to_node_ids": [
          "/src:unit[1]/diff:insert[1]"
        ],
        "to_raw_texts": [
          "char definition_moved() {\n  char d = 'd';\n\n  char e = 'e';\n  return d + e;\n}"
        ],
        "to_xpaths": [
          "/src:unit[1]/diff:insert[1]"
        ]
      }
    ],
    "regions_total": 9
  },
  "files": [
    {
      "unit_id": 1,
      "filename": "bar.cpp",
      "language": "C++",
      "revision_0_source_code": "\nchar coppied_function() { return 'a'; }\n",
      "revision_1_source_code": "char definition_moved() {\n  char d = 'd';\n\n  char e = 'e';\n  return d + e;\n}\n\nchar coppied_function() { return 'a'; }\n",
      "tree": {
        "id": "/src:unit[1]",
        "path": "/src:unit[1]",
        "tag": "unit",
        "label": "unit: bar.cpp",
        "kind": "plain",
        "move_id": null,
        "srcdiff_attributes": {
          "diff": null,
          "move": null,
          "position": null,
          "unit": {
            "filename": "bar.cpp",
            "hash": null,
            "language": "C++",
            "revision": "1.0.0",
            "timestamp": null,
            "url": null
          }
        },
        "xml_span": {
          "end_col": 8,
          "end_line": 12,
          "start_col": 1,
          "start_line": 4
        },
        "revision_0_span": {
          "end_col": 39,
          "end_line": 2,
          "start_col": 1,
          "start_line": 2
        },
        "revision_1_span": {
          "end_col": 39,
          "end_line": 8,
          "start_col": 1,
          "start_line": 1
        },
        "children": [
          {
            "id": "/src:unit[1]/diff:insert[1]",
            "path": "/src:unit[1]/diff:insert[1]",
            "tag": "diff:insert",
            "label": "diff:insert",
            "kind": "move",
            "move_id": "c89025cc1",
            "srcdiff_attributes": {
              "diff": {
                "revision": null,
                "type": null
              },
              "move": {
                "from_paths": [
                  "/src:unit[@filename='foo.cpp']/diff:delete[1]"
                ],
                "id": "c89025cc1",
                "to_paths": []
              },
              "position": null,
              "unit": null
            },
            "xml_span": {
              "end_col": 61,
              "end_line": 9,
              "start_col": 71,
              "start_line": 4
            },
            "revision_0_span": null,
            "revision_1_span": {
              "end_col": 1,
              "end_line": 6,
              "start_col": 1,
              "start_line": 1
            },
            "children": []
          }
        ]
      }
    },
    {
      "unit_id": 2,
      "filename": "bar.hpp",
      "language": "C++",
      "revision_0_source_code": "",
      "revision_1_source_code": "char delcaration_moved();\n",
      "tree": {
        "id": "/src:unit[2]",
        "path": "/src:unit[2]",
        "tag": "unit",
        "label": "unit: bar.hpp",
        "kind": "plain",
        "move_id": null,
        "srcdiff_attributes": {
          "diff": null,
          "move": null,
          "position": null,
          "unit": {
            "filename": "bar.hpp",
            "hash": null,
            "language": "C++",
            "revision": "1.0.0",
            "timestamp": null,
            "url": null
          }
        },
        "xml_span": {
          "end_col": 32,
          "end_line": 15,
          "start_col": 1,
          "start_line": 14
        },
        "revision_0_span": null,
        "revision_1_span": {
          "end_col": 25,
          "end_line": 1,
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
                  "/src:unit[@filename='foo.hpp']/diff:delete[2]"
                ],
                "id": "97b1dcdaf",
                "to_paths": []
              },
              "position": null,
              "unit": null
            },
            "xml_span": {
              "end_col": 25,
              "end_line": 15,
              "start_col": 71,
              "start_line": 14
            },
            "revision_0_span": null,
            "revision_1_span": {
              "end_col": 25,
              "end_line": 1,
              "start_col": 1,
              "start_line": 1
            },
            "children": []
          }
        ]
      }
    },
    {
      "unit_id": 3,
      "filename": "foo.cpp",
      "language": "C++",
      "revision_0_source_code": "#include \"foo.hpp\"\n\nchar unchanged_function() {\n  char a = 'a';\n  char b = 'b';\n  char c = 'c';\n  return a + b + c;\n}\n\nchar definition_moved() {\n  char d = 'd';\n  char e = 'e';\n  return d + e;\n}\n",
      "revision_1_source_code": "#include \"foo.hpp\"\n\nchar coppied_function() { return 'a'; }\n\nint changed_function() {\n  int x = 123;\n  int y = 456;\n  return x;\n}\n\nchar unchanged_function() {\n  char a = 'a';\n  char b = 'b';\n  char c = 'c';\n  return a + b + c;\n}\n",
      "tree": {
        "id": "/src:unit[3]",
        "path": "/src:unit[3]",
        "tag": "unit",
        "label": "unit: foo.cpp",
        "kind": "plain",
        "move_id": null,
        "srcdiff_attributes": {
          "diff": null,
          "move": null,
          "position": null,
          "unit": {
            "filename": "foo.cpp",
            "hash": null,
            "language": "C++",
            "revision": "1.0.0",
            "timestamp": null,
            "url": null
          }
        },
        "xml_span": {
          "end_col": 32,
          "end_line": 39,
          "start_col": 1,
          "start_line": 17
        },
        "revision_0_span": {
          "end_col": 1,
          "end_line": 14,
          "start_col": 1,
          "start_line": 1
        },
        "revision_1_span": {
          "end_col": 1,
          "end_line": 16,
          "start_col": 1,
          "start_line": 1
        },
        "children": [
          {
            "id": "/src:unit[3]/diff:delete[1]",
            "path": "/src:unit[3]/diff:delete[1]",
            "tag": "diff:delete",
            "label": "diff:delete",
            "kind": "move",
            "move_id": "c89025cc1",
            "srcdiff_attributes": {
              "diff": {
                "revision": null,
                "type": null
              },
              "move": {
                "from_paths": [],
                "id": "c89025cc1",
                "to_paths": [
                  "/src:unit[@filename='bar.cpp']/diff:insert[1]"
                ]
              },
              "position": null,
              "unit": null
            },
            "xml_span": {
              "end_col": 25,
              "end_line": 39,
              "start_col": 1,
              "start_line": 33
            },
            "revision_0_span": {
              "end_col": 1,
              "end_line": 14,
              "start_col": 1,
              "start_line": 10
            },
            "revision_1_span": null,
            "children": []
          }
        ]
      }
    },
    {
      "unit_id": 4,
      "filename": "foo.hpp",
      "language": "C++",
      "revision_0_source_code": "// This currently can not be captured because srcdiff deletes the function tag\n// and not the block.\nint changed_function() {\n  int x = 123;\n  int y = 456;\n  return x;\n}\n\nchar coppied_function() { return 'a'; }\n\nchar unchanged_function();\nchar delcaration_moved();\n",
      "revision_1_source_code": "// This currently can not be captured because srcdiff deletes the function tag\n// and not the block.\nint changed_function();\n\nchar unchanged_function();\n",
      "tree": {
        "id": "/src:unit[4]",
        "path": "/src:unit[4]",
        "tag": "unit",
        "label": "unit: foo.hpp",
        "kind": "plain",
        "move_id": null,
        "srcdiff_attributes": {
          "diff": null,
          "move": null,
          "position": null,
          "unit": {
            "filename": "foo.hpp",
            "hash": null,
            "language": "C++",
            "revision": "1.0.0",
            "timestamp": null,
            "url": null
          }
        },
        "xml_span": {
          "end_col": 32,
          "end_line": 53,
          "start_col": 1,
          "start_line": 41
        },
        "revision_0_span": {
          "end_col": 25,
          "end_line": 12,
          "start_col": 1,
          "start_line": 1
        },
        "revision_1_span": {
          "end_col": 26,
          "end_line": 5,
          "start_col": 1,
          "start_line": 1
        },
        "children": [
          {
            "id": "/src:unit[4]/diff:delete[2]",
            "path": "/src:unit[4]/diff:delete[2]",
            "tag": "diff:delete",
            "label": "diff:delete",
            "kind": "move",
            "move_id": "97b1dcdaf",
            "srcdiff_attributes": {
              "diff": {
                "revision": null,
                "type": null
              },
              "move": {
                "from_paths": [],
                "id": "97b1dcdaf",
                "to_paths": [
                  "/src:unit[@filename='bar.hpp']/diff:insert[1]"
                ]
              },
              "position": null,
              "unit": null
            },
            "xml_span": {
              "end_col": 25,
              "end_line": 53,
              "start_col": 1,
              "start_line": 52
            },
            "revision_0_span": {
              "end_col": 25,
              "end_line": 12,
              "start_col": 1,
              "start_line": 12
            },
            "revision_1_span": null,
            "children": []
          }
        ]
      }
    },
    {
      "unit_id": 5,
      "filename": "main.cpp",
      "language": "C++",
      "revision_0_source_code": "#import \"foo.hpp\"\n\nchar coppied_function() { return 'a'; }\n\nint main(int argc, char **argv) {\n  int  a = changed_function();\n  char c = unchanged_function();\n  return 1;\n}\n",
      "revision_1_source_code": "#import \"foo.hpp\"\n\nint main(int argc, char **argv) {\n  int  a = changed_function();\n  char c = unchanged_function();\n  return 1;\n}\n",
      "tree": {
        "id": "/src:unit[5]",
        "path": "/src:unit[5]",
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
          "end_line": 64,
          "start_col": 1,
          "start_line": 55
        },
        "revision_0_span": {
          "end_col": 1,
          "end_line": 9,
          "start_col": 1,
          "start_line": 1
        },
        "revision_1_span": {
          "end_col": 1,
          "end_line": 7,
          "start_col": 1,
          "start_line": 1
        },
        "children": []
      }
    }
  ]
}
`) as VisualizeResponse;

export const complexMovedFilenames = [
  "bar.cpp",
  "bar.hpp",
  "foo.cpp",
  "foo.hpp",
];

export const complexUntouchedFilenames = ["main.cpp"];
