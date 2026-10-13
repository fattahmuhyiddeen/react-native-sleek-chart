import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Text as SvgText, Circle, Line, Rect, G } from 'react-native-svg';

// Helper functions to calculate smooth bezier curves
const lineProperties = (pointA, pointB) => {
  const lengthX = pointB.x - pointA.x;
  const lengthY = pointB.y - pointA.y;
  return {
    length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
    angle: Math.atan2(lengthY, lengthX),
  };
};

const controlPoint = (current, previous, next, reverse) => {
  const p = previous || current;
  const n = next || current;
  const smoothing = 0.2;
  const o = lineProperties(p, n);
  const angle = o.angle + (reverse ? Math.PI : 0);
  const length = o.length * smoothing;
  return {
    x: current.x + Math.cos(angle) * length,
    y: current.y + Math.sin(angle) * length,
  };
};

const createSmoothPath = (points) => {
  return points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const cps = controlPoint(a[i - 1], a[i - 2], point);
    const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
    return `${acc} C ${cps.x},${cps.y} ${cpe.x},${cpe.y} ${point.x},${point.y}`;
  }, '');
};

const SmoothLineChart = ({ 
  data, 
  xAxisLabels, 
  showDots = false, 
  width = 350, 
  height = 150 
}) => {
  const [selectedIndex, setSelectedIndex] = useState(null);

  // Reduced top padding since the tooltip is no longer fixed at the top
  const padding = { top: 40, bottom: 40, left: 40, right: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Auto-generate Y-Axis based on data
  const dataMin = Math.floor(Math.min(...data));
  const dataMax = Math.ceil(Math.max(...data));
  const yRange = dataMax - dataMin || 1; 

  const yAxisLabels = [dataMax, Math.round((dataMax + dataMin) / 2), dataMin];

  // Map data to SVG coordinates
  const points = data.map((value, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((value - dataMin) / yRange) * chartHeight;
    return { x, y, value };
  });

  const path = createSmoothPath(points);

  const segmentWidth = chartWidth / Math.max(1, data.length - 1);

  // Calculate Tooltip Boundaries
  const renderTooltip = () => {
    if (selectedIndex === null) return null;

    const point = points[selectedIndex];
    const TOOLTIP_WIDTH = 100;
    const TOOLTIP_HEIGHT = 44;
    const MARGIN = 10;
    
    // Auto-aware Y position: default above point, flip below if it hits top edge
    let tooltipY = point.y - TOOLTIP_HEIGHT - 12;
    if (tooltipY < MARGIN) {
      tooltipY = point.y + 12;
    }

    // Auto-aware X position: center on point, constrain to SVG edges
    let tooltipX = point.x - (TOOLTIP_WIDTH / 2);
    if (tooltipX < MARGIN) {
      tooltipX = MARGIN; // Snap to left edge
    } else if (tooltipX + TOOLTIP_WIDTH > width - MARGIN) {
      tooltipX = width - TOOLTIP_WIDTH - MARGIN; // Snap to right edge
    }

    // Dynamic text centering based on shifted tooltip box
    const textCenterX = tooltipX + (TOOLTIP_WIDTH / 2);

    return (
      <G pointerEvents="none">
        {/* Vertical Indicator Line */}
        <Line
          x1={point.x}
          y1={MARGIN} 
          x2={point.x}
          y2={height - padding.bottom} 
          stroke="#000"
          strokeWidth="1"
        />

        {/* Tooltip Background */}
        <Rect
          x={tooltipX}
          y={tooltipY}
          width={TOOLTIP_WIDTH}
          height={TOOLTIP_HEIGHT}
          rx="6"
          fill="#FFF"
          stroke="#000"
          strokeWidth="1.5"
        />

        {/* Tooltip Main Value */}
        <SvgText
          x={textCenterX}
          y={tooltipY + 18}
          fontSize="13"
          fontWeight="bold"
          fill="#000"
          textAnchor="middle"
        >
          {point.value} kg
        </SvgText>

        {/* Tooltip Sub-label (Date) */}
        <SvgText
          x={textCenterX}
          y={tooltipY + 34}
          fontSize="12"
          fill="#777"
          textAnchor="middle"
        >
          {xAxisLabels[Math.round((selectedIndex / (data.length - 1)) * (xAxisLabels.length - 1))] || ''}
        </SvgText>

        {/* Point Highlight Ring */}
        <Circle
          cx={point.x}
          cy={point.y}
          r="4.5"
          fill="#FFF"
          stroke="#000"
          strokeWidth="2.5"
        />
      </G>
    );
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Y-Axis Labels */}
        {yAxisLabels.map((val, i) => {
          const yPos = padding.top + (i / 2) * chartHeight;
          return (
            <React.Fragment key={`y-${val}`}>
              <SvgText
                x={padding.left - 10}
                y={yPos + 5}
                fontSize="14"
                fill="#666"
                textAnchor="end"
              >
                {val}
              </SvgText>
              {i === 2 && (
                <Line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="#E0E0E0"
                  strokeWidth="1"
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Smooth Line Path */}
        <Path 
          d={path} 
          fill="none" 
          stroke="#007AFF" 
          strokeWidth="2" 
        />

        {/* Optional Data Points (Dots) */}
        {showDots && points.map((point, i) => (
          <Circle
            key={`dot-${i}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#007AFF"
            stroke="#FFF"
            strokeWidth="2"
          />
        ))}

        {/* Call tooltip render function */}
        {renderTooltip()}

        {/* Invisible vertical columns for perfect tap detection without overlap */}
        {points.map((point, i) => (
          <Rect
            key={`touch-${i}`}
            x={point.x - (segmentWidth / 2)}
            y={0}
            width={segmentWidth}
            height={height}
            fill="transparent"
            onPress={() => setSelectedIndex(selectedIndex === i ? null : i)}
          />
        ))}

        {/* X-Axis Labels */}
        {xAxisLabels.map((label, i) => {
          const xPos = padding.left + (i / (xAxisLabels.length - 1)) * chartWidth;
          return (
            <SvgText
              key={`x-${label}`}
              x={xPos}
              y={height - 10}
              fontSize="14"
              fill="#666"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

export default SmoothLineChart;