import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

const calculateNiceScale = (min, max, maxTicks = 5) => {
  if (min === max) return { niceMin: 0, niceMax: max || 10, ticks: [0, max || 10] };
  const range = max - min;
  const roughStep = range / (maxTicks - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normStep = roughStep / magnitude;
  
  let niceNormStep;
  if (normStep < 1.5) niceNormStep = 1;
  else if (normStep < 3) niceNormStep = 2;
  else if (normStep < 7) niceNormStep = 5;
  else niceNormStep = 10;
  
  const step = niceNormStep * magnitude;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  
  const ticks = [];
  for (let i = niceMin; i <= niceMax + 1e-10; i += step) {
    ticks.push(i);
  }
  return { niceMin, niceMax, ticks };
};

const RangeChart = ({
  data = [],
  chartHeight = 220,
  barWidth = 16,
  circleSize = 14,
  barColor = '#E0EAFF',
  primaryColor = '#0066FF',
  selectedColor = '#050B14',
  
  yAxisWidth = 35,
  xAxisHeight = 36,
  yAxisSuffix = '',
  
  defaultSelectedIndex = null,
  onPressItem = () => {},
}) => {
  const [selectedIndex, setSelectedIndex] = useState(defaultSelectedIndex);

  if (!data || data.length === 0) return null;

  const allValues = data.flatMap((d) => [d.solidValue, d.hollowValue]);
  const rawMax = Math.max(...allValues);
  const rawMin = Math.min(...allValues);

  const { niceMin, niceMax, ticks: yAxisTicks } = calculateNiceScale(rawMin, rawMax, 4);
  const range = niceMax - niceMin || 1; 

  const usableHeight = chartHeight - barWidth;
  const padding = (barWidth - circleSize) / 2;
  
  const getPixelHeight = (val) => ((val - niceMin) / range) * usableHeight;

  // Toggle selection on bar press
  const handleBarPress = (index) => {
    const newIndex = selectedIndex === index ? null : index;
    setSelectedIndex(newIndex);
    if (onPressItem) onPressItem(newIndex);
  };

  // Dismiss selection on background press
  const handleBackgroundPress = () => {
    setSelectedIndex(null);
    if (onPressItem) onPressItem(null);
  };

  return (
    <Pressable 
      style={styles.wrapper} 
      onPress={handleBackgroundPress} 
      android_disableSound={true} 
    >
      
      {/* Y AXIS */}
      <View style={[styles.yAxisContainer, { width: yAxisWidth, height: chartHeight }]}>
        {yAxisTicks.map((tick, index) => {
          const bottomPosition = getPixelHeight(tick) + barWidth / 2;
          return (
            <Text
              key={`y-axis-${index}`}
              style={[styles.yAxisLabel, { bottom: bottomPosition - 8 }]}
              numberOfLines={1}
            >
              {tick}{yAxisSuffix}
            </Text>
          );
        })}
      </View>

      {/* CHART AREA */}
      <View style={{ flex: 1, zIndex: 1 }}>
        {/* Added bottom border here to create the single X-axis line */}
        <View style={[styles.chartArea, { height: chartHeight }]}>
          
          {/* Bars */}
          <View style={styles.barsContainer}>
            {data.map((item, index) => {
              const { solidValue, hollowValue, dayLabel, dateLabel, tooltipTitle, tooltipSubtitle } = item;
              
              const topVal = Math.max(solidValue, hollowValue);
              const bottomVal = Math.min(solidValue, hollowValue);

              const barBottom = getPixelHeight(bottomVal);
              const barHeight = getPixelHeight(topVal) - barBottom + barWidth;
              const isSolidTop = solidValue >= hollowValue;
              
              const isSelected = selectedIndex === index;
              const activeBarColor = isSelected ? selectedColor : barColor;
              const activePrimaryColor = isSelected ? selectedColor : primaryColor;
              const circleBorderColor = isSelected ? '#FFFFFF' : primaryColor;

              return (
                <Pressable 
                  key={`bar-${index}`} 
                  style={[styles.column, { zIndex: isSelected ? 10 : 1 }]}
                  onPress={() => handleBarPress(index)}
                >
                  
                  {/* Bar Wrapper */}
                  <View style={{ height: chartHeight, width: barWidth }}>
                    
                    {/* Selected Vertical Drop-line (Now spans 100% up to down) */}
                    {isSelected && (
                      <View 
                        style={[
                          styles.dropLine, 
                          { height: '100%', top: 0, backgroundColor: selectedColor }
                        ]} 
                      />
                    )}

                    <View
                      style={[
                        styles.bar,
                        {
                          bottom: barBottom,
                          height: barHeight,
                          width: barWidth,
                          borderRadius: barWidth / 2,
                          backgroundColor: activeBarColor,
                        },
                      ]}
                    >
                      {/* Top Circle */}
                      <View
                        style={[
                          styles.circle,
                          {
                            width: circleSize,
                            height: circleSize,
                            borderRadius: circleSize / 2,
                            top: padding,
                            backgroundColor: isSolidTop ? activePrimaryColor : (isSelected ? selectedColor : '#FFFFFF'),
                            borderColor: circleBorderColor,
                            borderWidth: 2,
                          },
                        ]}
                      >
                         {(!isSolidTop && isSelected) && <View style={styles.hollowInnerDot} />}
                      </View>

                      {/* Bottom Circle */}
                      <View
                        style={[
                          styles.circle,
                          {
                            width: circleSize,
                            height: circleSize,
                            borderRadius: circleSize / 2,
                            bottom: padding,
                            backgroundColor: !isSolidTop ? activePrimaryColor : (isSelected ? selectedColor : '#FFFFFF'),
                            borderColor: circleBorderColor,
                            borderWidth: 2,
                          },
                        ]}
                      >
                        {(isSolidTop && isSelected) && <View style={styles.hollowInnerDot} />}
                      </View>
                    </View>
                  </View>

                  {/* Tooltip */}
                  {isSelected && (
                    <View style={[styles.tooltipContainer, { bottom: barBottom + barHeight + 8 }]}>
                      <Text style={styles.tooltipTitle}>{tooltipTitle}</Text>
                      <Text style={styles.tooltipSubtitle}>{tooltipSubtitle}</Text>
                    </View>
                  )}

                  {/* Multi-line X Axis Label */}
                  <View style={{ height: xAxisHeight, justifyContent: 'flex-start', marginTop: 8 }}>
                    <Text style={[styles.xAxisLabelDay, isSelected && { color: selectedColor, fontWeight: '600' }]}>
                      {dayLabel || ''}
                    </Text>
                    <Text style={styles.xAxisLabelDate}>
                      {dateLabel || ''}
                    </Text>
                  </View>
                  
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    width: '100%',
  },
  yAxisContainer: {
    position: 'relative',
    // Removed borderRightWidth from here so the Y-axis has no line
    marginRight: 8,
  },
  yAxisLabel: {
    position: 'absolute',
    right: 8,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    width: '100%',
  },
  chartArea: {
    position: 'relative',
    width: '100%',
    // Added X-axis line here
    borderBottomWidth: 1, 
    borderColor: '#E5E7EB',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  column: {
    alignItems: 'center',
    position: 'relative',
  },
  dropLine: {
    position: 'absolute',
    width: 1,
    alignSelf: 'center',
    zIndex: -1,
  },
  bar: {
    position: 'absolute',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hollowInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  xAxisLabelDay: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 2,
  },
  xAxisLabelDate: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  tooltipContainer: {
    position: 'absolute',
    zIndex: 100, 
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    width: 110,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  tooltipSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  }
});

export default RangeChart;