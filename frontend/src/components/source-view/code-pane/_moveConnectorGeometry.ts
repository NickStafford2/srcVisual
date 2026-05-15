export type RectLike = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

export type MoveConnectorPath = {
  key: string;
  d: string;
};

export type MoveConnectorHub = {
  key: string;
  cx: number;
  cy: number;
  r: number;
};

export type MoveConnectorGroup = {
  key: string;
  paths: MoveConnectorPath[];
  hub: MoveConnectorHub | null;
};

type Point = {
  x: number;
  y: number;
};

type BuildMoveConnectorGroupOptions = {
  moveId: string;
  containerRect: RectLike;
  fromRects: RectLike[];
  toRects: RectLike[];
};

export function getCombinedRect(rects: RectLike[]): RectLike | null {
  if (rects.length === 0) {
    return null;
  }

  const _left = Math.min(...rects.map((rect) => rect.left));
  const _right = Math.max(...rects.map((rect) => rect.right));
  const _top = Math.min(...rects.map((rect) => rect.top));
  const _bottom = Math.max(...rects.map((rect) => rect.bottom));

  return {
    left: _left,
    right: _right,
    top: _top,
    bottom: _bottom,
    width: _right - _left,
    height: _bottom - _top,
  };
}

export function buildMoveConnectorGroup({
  moveId,
  containerRect,
  fromRects,
  toRects,
}: BuildMoveConnectorGroupOptions): MoveConnectorGroup | null {
  const _fromBlocks = clusterMoveRects(fromRects);
  const _toBlocks = clusterMoveRects(toRects);

  if (_fromBlocks.length === 0 || _toBlocks.length === 0) {
    return null;
  }

  if (_fromBlocks.length === 1 && _toBlocks.length === 1) {
    const _fromAnchor = buildRevision0Anchor(_fromBlocks[0], containerRect);
    const _toAnchor = buildRevision1Anchor(_toBlocks[0], containerRect);

    return {
      key: moveId,
      hub: null,
      paths: [
        {
          key: `${moveId}-direct`,
          d: buildCurvePath(_fromAnchor, _toAnchor),
        },
      ],
    };
  }

  const _fromAnchors = _fromBlocks.map((block) =>
    buildRevision0Anchor(block, containerRect),
  );
  const _toAnchors = _toBlocks.map((block) =>
    buildRevision1Anchor(block, containerRect),
  );
  const _hub = buildHub(moveId, _fromAnchors, _toAnchors);
  const _hubPoint = { x: _hub.cx, y: _hub.cy };

  return {
    key: moveId,
    hub: _hub,
    paths: [
      ..._fromAnchors.map((anchor, index) => ({
        key: `${moveId}-from-${index}`,
        d: buildCurvePath(anchor, _hubPoint),
      })),
      ..._toAnchors.map((anchor, index) => ({
        key: `${moveId}-to-${index}`,
        d: buildCurvePath(_hubPoint, anchor),
      })),
    ],
  };
}

export function clusterMoveRects(rects: RectLike[]): RectLike[] {
  if (rects.length === 0) {
    return [];
  }

  const _sortedRects = [...rects].sort(
    (left, right) => left.top - right.top || left.left - right.left,
  );
  const _averageHeight =
    _sortedRects.reduce((sum, rect) => sum + rect.height, 0) /
    _sortedRects.length;
  const _gapThreshold = Math.max(8, _averageHeight * 0.75);
  const _blocks: RectLike[] = [];
  let _currentBlock = _sortedRects[0];

  for (const _rect of _sortedRects.slice(1)) {
    if (_rect.top <= _currentBlock.bottom + _gapThreshold) {
      _currentBlock = mergeRects(_currentBlock, _rect);
      continue;
    }

    _blocks.push(_currentBlock);
    _currentBlock = _rect;
  }

  _blocks.push(_currentBlock);
  return _blocks;
}

function buildRevision0Anchor(rect: RectLike, containerRect: RectLike): Point {
  return {
    x: rect.right - containerRect.left,
    y: rect.top + rect.height / 2 - containerRect.top,
  };
}

function buildRevision1Anchor(rect: RectLike, containerRect: RectLike): Point {
  return {
    x: rect.left - containerRect.left,
    y: rect.top + rect.height / 2 - containerRect.top,
  };
}

function buildHub(
  moveId: string,
  fromAnchors: Point[],
  toAnchors: Point[],
): MoveConnectorHub {
  const _allAnchors = [...fromAnchors, ...toAnchors];
  const _hubX =
    (average(fromAnchors.map((anchor) => anchor.x)) +
      average(toAnchors.map((anchor) => anchor.x))) /
    2;
  const _hubY = median(_allAnchors.map((anchor) => anchor.y));

  return {
    key: `${moveId}-hub`,
    cx: _hubX,
    cy: _hubY,
    r: 4,
  };
}

function buildCurvePath(start: Point, end: Point): string {
  const _direction = end.x >= start.x ? 1 : -1;
  const _controlOffset = Math.max(32, Math.abs(end.x - start.x) * 0.35);

  return [
    `M ${start.x} ${start.y}`,
    `C ${start.x + _direction * _controlOffset} ${start.y}`,
    `${end.x - _direction * _controlOffset} ${end.y}`,
    `${end.x} ${end.y}`,
  ].join(" ");
}

function mergeRects(left: RectLike, right: RectLike): RectLike {
  return getCombinedRect([left, right]) as RectLike;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  const _sortedValues = [...values].sort((left, right) => left - right);
  const _middleIndex = Math.floor(_sortedValues.length / 2);

  if (_sortedValues.length % 2 === 0) {
    return (_sortedValues[_middleIndex - 1] + _sortedValues[_middleIndex]) / 2;
  }

  return _sortedValues[_middleIndex];
}
