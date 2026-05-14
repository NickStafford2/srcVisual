# Backend

## Skip files that have position/move data

auto detect if a script is a srcMove xml file
auto detect if a srcDiff has position information already.
Depending on these factors, adjust how the backend works to save calculation time.

# Frontend

## MoveTooltip

This is all wrong. it should be on the xml section. the goal is to be able to show the src code of any xml tag without needing to scroll to src code. this should not be just on highlights. wherever you put your mouse, a tooltip should appear showing the src code inside that tag.
