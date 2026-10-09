import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';

const catmullRom = (p0, p1, p2, p3, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
};

const generateSmoothPoints = (data, stepsPerSegment = 15) => {
  const smoothData = [];
  for (let i = 0; i < data.length - 1; i++) {
    const p0 = data[Math.max(i - 1, 0)];
    const p1 = data[i];
    const p2 = data[i + 1];
    const p3 = data[Math.min(i + 2, data.length - 1)];

    for (let t = 0; t < 1; t += 1 / stepsPerSegment) {
      smoothData.push(catmullRom(p0, p1, p2, p3, t));
    }
  }
  smoothData.push(data[data.length - 1]);
  return smoothData;
};

const LineChart = ({
  data = [],
  xAxis = [],
  dataLabels = [],
  unit = '',
  showDots = false,
  dotSize = 8,
  dotColor = '#007AFF'
}) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedIndex, setSelectedIndex] = useState(null);

  const minVal = Math.floor(Math.min(...data));
  const maxVal = Math.ceil(Math.max(...data));
  const yRange = maxVal - minVal || 1;

  const yAxisLabels = [];
  for (let i = maxVal; i >= minVal; i--) {
    yAxisLabels.push(i);
  }

  const getSmoothX = (index, smoothDataLength) => (index / (smoothDataLength - 1)) * dimensions.width;
  const getRawX = (index) => (index / (data.length - 1)) * dimensions.width;
  const getY = (val) => dimensions.height - ((val - minVal) / yRange) * dimensions.height;

  const handleOutsidePress = () => {
    setSelectedIndex(null);
  };

  const renderLines = () => {
    if (!dimensions.width || !dimensions.height || data.length === 0) return null;

    const smoothData = generateSmoothPoints(data);
    const segments = [];

    for (let i = 0; i < smoothData.length - 1; i++) {
      const x1 = getSmoothX(i, smoothData.length);
      const y1 = getY(smoothData[i]);
      const x2 = getSmoothX(i + 1, smoothData.length);
      const y2 = getY(smoothData[i + 1]);

      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy) + 1.5;
      const angle = Math.atan2(dy, dx);

      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;

      segments.push(
        <View
          key={`segment-${i}`}
          style={[
            styles.lineSegment,
            {
              left: cx - distance / 2,
              top: cy - 1,
              width: distance,
              transform: [{ rotate: `${angle}rad` }],
            },
          ]}
        />
      );
    }
    return segments;
  };

  const renderDots = () => {
    if (!dimensions.width || !dimensions.height || data.length === 0) return null;

    return data.map((val, index) => {
      const x = getRawX(index);
      const y = getY(val);
      const isSelected = selectedIndex === index;
      const hitAreaSize = Math.max(dotSize * 3, 30);

      return (
        <TouchableOpacity
          key={`dot-${index}`}
          activeOpacity={0.8}
          onPress={() => setSelectedIndex(index)}
          style={{
            position: 'absolute',
            left: x - hitAreaSize / 2,
            top: y - hitAreaSize / 2,
            width: hitAreaSize,
            height: hitAreaSize,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: isSelected ? 10 : 5,
          }}
        >
          {showDots && !isSelected && (
            <View
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: dotColor,
              }}
            />
          )}

          {isSelected && (
            <View
              style={{
                width: dotSize * 1.5,
                height: dotSize * 1.5,
                borderRadius: (dotSize * 1.5) / 2,
                backgroundColor: '#FFF',
                borderWidth: 2,
                borderColor: '#000',
              }}
            />
          )}
        </TouchableOpacity>
      );
    });
  };

  const renderTooltip = () => {
    if (selectedIndex === null || !dimensions.width || !dimensions.height) return null;

    const x = getRawX(selectedIndex);
    const y = getY(data[selectedIndex]);
    const val = data[selectedIndex];
    const dateLabel = dataLabels[selectedIndex] || '';

    const tooltipWidth = 100;
    let tooltipLeft = x - tooltipWidth / 2;
    if (tooltipLeft < 0) tooltipLeft = 0;
    if (tooltipLeft + tooltipWidth > dimensions.width) tooltipLeft = dimensions.width - tooltipWidth;

    return (
      <View style={[styles.tooltipContainer, { left: tooltipLeft, top: y - 60 }]}>
        <View style={styles.tooltipBox}>
          <Text style={styles.tooltipValue}>{val} {unit}</Text>
          {dateLabel ? <Text style={styles.tooltipDate}>{dateLabel}</Text> : null}
        </View>
      </View>
    );
  };

  const renderVerticalLine = () => {
    if (selectedIndex === null || !dimensions.width || !dimensions.height) return null;
    const x = getRawX(selectedIndex);

    return (
      <View
        style={[
          styles.verticalLine,
          {
            left: x,
            height: dimensions.height + 20,
            top: -20,
          }
        ]}
      />
    );
  };

  return (
    <Pressable style={styles.container} onPress={handleOutsidePress}>
      <View style={styles.yAxis}>
        {yAxisLabels.map((label, index) => (
          <Text key={index} style={styles.axisText}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.chartWrapper}>
        <View
          style={styles.chartArea}
          onLayout={(e) => setDimensions(e.nativeEvent.layout)}
        >
          <View style={[styles.gridLine, { top: dimensions.height }]} />

          {renderVerticalLine()}
          {renderLines()}
          {renderDots()}
          {renderTooltip()}
        </View>

        <View style={styles.xAxis}>
          {xAxis.map((label, index) => (
            <Text key={index} style={styles.axisText}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 250,
    padding: 20,
    backgroundColor: '#fff',
  },
  yAxis: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 15,
    paddingBottom: 30,
  },
  chartWrapper: {
    flex: 1,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
  },
  axisText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#007AFF',
    borderRadius: 1,
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  verticalLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#000',
    zIndex: 1,
  },
  tooltipContainer: {
    position: 'absolute',
    width: 100,
    alignItems: 'center',
    zIndex: 20,
  },
  tooltipBox: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tooltipValue: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 14,
  },
  tooltipDate: {
    color: '#6c757d',
    fontSize: 12,
    marginTop: 2,
  }
});

export default LineChart;