import re

from srcvisual.core.srcdiff_restore import restore_original_srcdiff_metadata


def test_restore_original_srcdiff_metadata_does_not_emit_synthetic_prefixes() -> None:
    original_xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff"
      revision="1.0.0"
      filename="main.cpp|main.cpp">
  <diff:delete><name>old</name></diff:delete>
</unit>
"""
    generated_xml = """<?xml version="1.0" encoding="UTF-8"?>
<ns0:unit xmlns:ns0="http://www.srcML.org/srcML/src"
          xmlns:ns1="http://www.srcML.org/srcML/position"
          xmlns:ns2="http://www.srcML.org/srcDiff"
          xmlns:ns3="http://www.srcML.org/srcMove"
          revision="generated"
          filename="generated.cpp|generated.cpp"
          ns1:tabs="8">
  <ns2:delete ns3:id="move-1" ns1:start="1:1" ns1:end="1:3">
    <ns0:name>old</ns0:name>
  </ns2:delete>
</ns0:unit>
"""

    restored_xml = restore_original_srcdiff_metadata(
        original_xml=original_xml,
        generated_xml=generated_xml,
    )

    assert re.search(r"\bxmlns:ns\d+=", restored_xml) is None
    assert "<unit" in restored_xml
    assert "<diff:delete" in restored_xml
    assert 'xmlns:diff="http://www.srcML.org/srcDiff"' in restored_xml
    assert 'xmlns:mv="http://www.srcML.org/srcMove"' in restored_xml
    assert 'xmlns:pos="http://www.srcML.org/srcML/position"' in restored_xml
    assert 'filename="main.cpp|main.cpp"' in restored_xml
    assert 'revision="1.0.0"' in restored_xml
    assert 'mv:id="move-1"' in restored_xml
    assert 'pos:start="1:1"' in restored_xml
