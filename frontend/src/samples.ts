export const SIMPLE_MOVE_SAMPLE = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" revision="1.0.0" url="/home/nick/Projects/srcMLBuildTemplate/srcMove/test/e2e_generated/complex/original|/home/nick/Projects/srcMLBuildTemplate/srcMove/test/e2e_generated/complex/modified">

<unit revision="1.0.0" language="C++" filename="bar.cpp"><diff:insert><function><type><name>char</name></type><diff:ws> </diff:ws><name>definition_moved</name><parameter_list>()</parameter_list><diff:ws> </diff:ws><block>{<block_content><diff:ws>
  </diff:ws><decl_stmt><decl><type><name>char</name></type><diff:ws> </diff:ws><name>d</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="char">'d'</literal></expr></init></decl>;</decl_stmt><diff:ws>

  </diff:ws><decl_stmt><decl><type><name>char</name></type><diff:ws> </diff:ws><name>e</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="char">'e'</literal></expr></init></decl>;</decl_stmt><diff:ws>
  </diff:ws><return>return<diff:ws> </diff:ws><expr><name>d</name><diff:ws> </diff:ws><operator>+</operator><diff:ws> </diff:ws><name>e</name></expr>;</return><diff:ws>
</diff:ws></block_content>}</block></function></diff:insert>
<diff:insert><diff:ws>
</diff:ws></diff:insert><function><type><name>char</name></type> <name>coppied_function</name><parameter_list>()</parameter_list> <block>{<block_content> <return>return <expr><literal type="char">'a'</literal></expr>;</return> </block_content>}</block></function>
</unit>

<unit revision="1.0.0" language="C++" filename="bar.hpp"><diff:insert><function_decl><type><name>char</name></type><diff:ws> </diff:ws><name>delcaration_moved</name><parameter_list>()</parameter_list>;</function_decl><diff:ws>
</diff:ws></diff:insert></unit>

<unit xmlns:cpp="http://www.srcML.org/srcML/cpp" revision="1.0.0" language="C++" filename="foo.cpp"><cpp:include>#<cpp:directive>include</cpp:directive> <cpp:file>"foo.hpp"</cpp:file></cpp:include>

<diff:insert><function><type><name>char</name></type><diff:ws> </diff:ws><name>coppied_function</name><parameter_list>()</parameter_list><diff:ws> </diff:ws><block>{<block_content><diff:ws> </diff:ws><return>return<diff:ws> </diff:ws><expr><literal type="char">'a'</literal></expr>;</return><diff:ws> </diff:ws></block_content>}</block></function><diff:ws>

</diff:ws><function><type><name>int</name></type><diff:ws> </diff:ws><name>changed_function</name><parameter_list>()</parameter_list><diff:ws> </diff:ws><block>{<block_content><diff:ws>
  </diff:ws><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>x</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">123</literal></expr></init></decl>;</decl_stmt><diff:ws>
  </diff:ws><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>y</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">456</literal></expr></init></decl>;</decl_stmt><diff:ws>
  </diff:ws><return>return<diff:ws> </diff:ws><expr><name>x</name></expr>;</return><diff:ws>
</diff:ws></block_content>}</block></function><diff:ws>

</diff:ws></diff:insert><function><type><name>char</name></type> <name>unchanged_function</name><parameter_list>()</parameter_list> <block>{<block_content>
  <decl_stmt><decl><type><name>char</name></type> <name>a</name> <init>= <expr><literal type="char">'a'</literal></expr></init></decl>;</decl_stmt>
  <decl_stmt><decl><type><name>char</name></type> <name>b</name> <init>= <expr><literal type="char">'b'</literal></expr></init></decl>;</decl_stmt>
  <decl_stmt><decl><type><name>char</name></type> <name>c</name> <init>= <expr><literal type="char">'c'</literal></expr></init></decl>;</decl_stmt>
  <return>return <expr><name>a</name> <operator>+</operator> <name>b</name> <operator>+</operator> <name>c</name></expr>;</return>
</block_content>}</block></function>
<diff:delete><diff:ws>
</diff:ws><function><type><name>char</name></type><diff:ws> </diff:ws><name>definition_moved</name><parameter_list>()</parameter_list><diff:ws> </diff:ws><block>{<block_content><diff:ws>
  </diff:ws><decl_stmt><decl><type><name>char</name></type><diff:ws> </diff:ws><name>d</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="char">'d'</literal></expr></init></decl>;</decl_stmt><diff:ws>
  </diff:ws><decl_stmt><decl><type><name>char</name></type><diff:ws> </diff:ws><name>e</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="char">'e'</literal></expr></init></decl>;</decl_stmt><diff:ws>
  </diff:ws><return>return<diff:ws> </diff:ws><expr><name>d</name><diff:ws> </diff:ws><operator>+</operator><diff:ws> </diff:ws><name>e</name></expr>;</return><diff:ws>
</diff:ws></block_content>}</block></function><diff:ws>
</diff:ws></diff:delete></unit>

<unit revision="1.0.0" language="C++" filename="foo.hpp"><comment type="line">// This currently can not be captured because srcdiff deletes the function tag</comment>
<comment type="line">// and not the block.</comment>
<diff:delete type="replace"><function><type><name>int</name></type><diff:ws> </diff:ws><name>changed_function</name><parameter_list>()</parameter_list><diff:ws> </diff:ws><block>{<block_content><diff:ws>
  </diff:ws><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>x</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">123</literal></expr></init></decl>;</decl_stmt><diff:ws>
  </diff:ws><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>y</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">456</literal></expr></init></decl>;</decl_stmt><diff:ws>
  </diff:ws><return>return<diff:ws> </diff:ws><expr><name>x</name></expr>;</return><diff:ws>
</diff:ws></block_content>}</block></function><diff:ws>

</diff:ws><function><type><name>char</name></type><diff:ws> </diff:ws><name>coppied_function</name><parameter_list>()</parameter_list><diff:ws> </diff:ws><block>{<block_content><diff:ws> </diff:ws><return>return<diff:ws> </diff:ws><expr><literal type="char">'a'</literal></expr>;</return><diff:ws> </diff:ws></block_content>}</block></function></diff:delete><diff:insert type="replace"><function_decl><type><name>int</name></type><diff:ws> </diff:ws><name>changed_function</name><parameter_list>()</parameter_list>;</function_decl></diff:insert>

<function_decl><type><name>char</name></type> <name>unchanged_function</name><parameter_list>()</parameter_list>;</function_decl>
<diff:delete><function_decl><type><name>char</name></type><diff:ws> </diff:ws><name>delcaration_moved</name><parameter_list>()</parameter_list>;</function_decl><diff:ws>
</diff:ws></diff:delete></unit>

<unit xmlns:cpp="http://www.srcML.org/srcML/cpp" revision="1.0.0" language="C++" filename="main.cpp"><cpp:empty>#import "foo.hpp"</cpp:empty>

<diff:delete><function><type><name>char</name></type><diff:ws> </diff:ws><name>coppied_function</name><parameter_list>()</parameter_list><diff:ws> </diff:ws><block>{<block_content><diff:ws> </diff:ws><return>return<diff:ws> </diff:ws><expr><literal type="char">'a'</literal></expr>;</return><diff:ws> </diff:ws></block_content>}</block></function><diff:ws>

</diff:ws></diff:delete><function><type><name>int</name></type> <name>main</name><parameter_list>(<parameter><decl><type><name>int</name></type> <name>argc</name></decl></parameter>, <parameter><decl><type><name>char</name> <modifier>*</modifier><modifier>*</modifier></type><name>argv</name></decl></parameter>)</parameter_list> <block>{<block_content>
  <decl_stmt><decl><type><name>int</name></type>  <name>a</name> <init>= <expr><call><name>changed_function</name><argument_list>()</argument_list></call></expr></init></decl>;</decl_stmt>
  <decl_stmt><decl><type><name>char</name></type> <name>c</name> <init>= <expr><call><name>unchanged_function</name><argument_list>()</argument_list></call></expr></init></decl>;</decl_stmt>
  <return>return <expr><literal type="number">1</literal></expr>;</return>
</block_content>}</block></function>
</unit>

</unit>`;

export const NESTED_SAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" revision="1.0.0" language="C++" filename="test/alphabetize/original.cpp|test/alphabetize/modified.cpp"><function><type><name>int</name></type> <name>main</name><parameter_list>()</parameter_list> <block>{<block_content>
<diff:delete><diff:ws>  </diff:ws><diff:delete move="1"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>h</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="2"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>i</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="3"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>g</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="4"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>t</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="5"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>j</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="6"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>u</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="7"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>v</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="8"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>w</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="9"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>c</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="10"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>p</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="11"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>z</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
</diff:ws></diff:delete>  <decl_stmt><decl><type><name>int</name></type> <name>a</name> <init>= <expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt>
  <decl_stmt><decl><type><name>int</name></type> <name>b</name> <init>= <expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt>
<diff:delete type="replace"><diff:ws>  </diff:ws><diff:delete move="12"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>r</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete></diff:delete><diff:insert type="replace"><diff:ws>  </diff:ws><diff:insert move="9"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>c</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="14"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>d</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert></diff:insert>
  <decl_stmt><decl><type><name>int</name></type> <name>e</name> <init>= <expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt>
  <decl_stmt><decl><type><name>int</name></type> <name>f</name> <init>= <expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt>
<diff:insert><diff:ws>  </diff:ws><diff:insert move="3"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>g</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="1"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>h</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="2"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>i</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="5"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>j</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="17"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>k</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="18"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>l</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="16"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>m</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
</diff:ws></diff:insert>  <decl_stmt><decl><type><name>int</name></type> <name>n</name> <init>= <expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt>
  <decl_stmt><decl><type><name>int</name></type> <name>o</name> <init>= <expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt>
<diff:delete type="replace"><diff:ws>  </diff:ws><diff:delete move="13"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>x</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="14"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>d</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete></diff:delete><diff:insert type="replace"><diff:ws>  </diff:ws><diff:insert move="10"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>p</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert></diff:insert>
  <decl_stmt><decl><type><name>int</name></type> <name>q</name> <init>= <expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt>
<diff:delete type="replace"><diff:ws>  </diff:ws><diff:delete move="15"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>y</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete></diff:delete><diff:insert type="replace"><diff:ws>  </diff:ws><diff:insert move="12"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>r</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert></diff:insert>
  <decl_stmt><decl><type><name>int</name></type> <name>s</name> <init>= <expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt>
<diff:delete type="replace"><diff:ws>  </diff:ws><diff:delete move="16"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>m</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="17"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>k</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete><diff:ws>
  </diff:ws><diff:delete move="18"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>l</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:delete></diff:delete><diff:insert type="replace"><diff:ws>  </diff:ws><diff:insert move="4"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>t</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="6"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>u</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="7"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>v</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="8"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>w</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="13"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>x</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="15"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>y</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert><diff:ws>
  </diff:ws><diff:insert move="11"><decl_stmt><decl><type><name>int</name></type><diff:ws> </diff:ws><name>z</name><diff:ws> </diff:ws><init>=<diff:ws> </diff:ws><expr><literal type="number">0</literal></expr></init></decl>;</decl_stmt></diff:insert></diff:insert>
  <return>return <expr><literal type="number">0</literal></expr>;</return>
</block_content>}</block></function>
</unit>`;

export const DELETE_INSERT_SAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" language="C++" filename="rename.cpp">
int stable = 1;
<diff:delete>int before_name = stable;</diff:delete>
<diff:insert>int after_name = stable;</diff:insert>
return stable;
</unit>
`;
