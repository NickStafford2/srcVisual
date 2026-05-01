export const SIMPLE_MOVE_SAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" xmlns:mv="http://www.srcML.org/srcMove" revision="1.0.0" language="C++" filename="pre_marked.cpp">

  <diff:delete move="1">int a;</diff:delete>
  <diff:insert move="1">int a;</diff:insert>

</unit>
`;

export const NESTED_SAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" xmlns:mv="http://www.srcML.org/srcMove" revision="1.0.0" language="C++" filename="nested.cpp">

  <diff:delete>
    if (x) {
      <diff:delete mv:move="1" mv:partner="/src:unit/diff:insert/diff:insert">int a;</diff:delete>
    }
  </diff:delete>

  <diff:insert>
    if (x) {
      <diff:insert mv:move="1" mv:partner="/src:unit/diff:delete/diff:delete">int a;</diff:insert>
    }
  </diff:insert>

</unit>
`;

export const DELETE_INSERT_SAMPLE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" language="C++" filename="rename.cpp">
int stable = 1;
<diff:delete>int before_name = stable;</diff:delete>
<diff:insert>int after_name = stable;</diff:insert>
return stable;
</unit>
`;
