// IMPROVED JSONCrackViewer.jsx - Better FallbackViewer for Template Data

import React, { useEffect, useRef, useState } from 'react';

const JSONCrackViewer = ({ data, width = 800, height = 600, theme = 'dark' }) => {
  // This will be implemented later when jsongraph-react works properly
  return null;
};

// ENHANCED FallbackViewer - MetaFold Template Data Display
const FallbackViewer = ({ data }) => {
  const [viewMode, setViewMode] = useState('structured'); // 'structured' or 'raw'
  const [expandedSections, setExpandedSections] = useState(new Set());

  const toggleSection = (sectionKey) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const formatValue = (value, maxLength = 100) => {
    if (typeof value === 'string') {
      return value.length > maxLength ? `"${value.substring(0, maxLength)}..."` : `"${value}"`;
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return `Array[${value.length}]`;
      } else {
        return `Object{${Object.keys(value).length}}`;
      }
    }
    return String(value);
  };

  const renderSectionContent = (value, isExpanded = false) => {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return (
          <div style={{ marginTop: '10px' }}>
            {isExpanded ? (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
                <pre style={{ margin: 0, fontSize: '11px', color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                Array with {value.length} items • Click to expand
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div style={{ marginTop: '10px' }}>
            {isExpanded ? (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
                <pre style={{ margin: 0, fontSize: '11px', color: '#e0e0e0', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                {Object.entries(value).slice(0, 3).map(([key, val]) => (
                  <div key={key} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    margin: '3px 0',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: '#7dd3fc', fontWeight: '500' }}>{key}:</span>
                    <span style={{ color: '#86efac' }}>{formatValue(val, 30)}</span>
                  </div>
                ))}
                {Object.keys(value).length > 3 && (
                  <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '11px', marginTop: '5px' }}>
                    ... and {Object.keys(value).length - 3} more • Click to expand
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
    } else {
      return (
        <div style={{ marginTop: '10px', color: '#86efac', fontSize: '13px' }}>
          {formatValue(value)}
        </div>
      );
    }
  };

  const getSectionIcon = (value) => {
    if (Array.isArray(value)) return '📋';
    if (typeof value === 'object' && value !== null) return '🗂️';
    return '📄';
  };

  const getSectionColor = (value) => {
    if (Array.isArray(value)) return 'rgba(59, 130, 246, 0.3)'; // Blue
    if (typeof value === 'object' && value !== null) return 'rgba(124, 58, 237, 0.3)'; // Purple
    return 'rgba(16, 185, 129, 0.3)'; // Green
  };

  return (
    <div style={{ 
      height: '100%',
      padding: '20px',
      background: 'linear-gradient(135deg, #1e1e2e, #2a2a40)',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
        <h3 style={{ color: '#a855f7', margin: '0 0 10px 0', fontSize: '24px' }}>
          MetaFold Template Data
        </h3>
        <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>
          Interactive structured view of your experiment template
        </p>
      </div>

      {/* View Mode Toggle */}
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' }}>
          <button 
            onClick={() => setViewMode('structured')}
            style={{
              background: viewMode === 'structured' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'transparent',
              color: viewMode === 'structured' ? 'white' : '#9ca3af',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            📊 Structured View
          </button>
          <button 
            onClick={() => setViewMode('raw')}
            style={{
              background: viewMode === 'raw' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'transparent',
              color: viewMode === 'raw' ? 'white' : '#9ca3af',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            📄 Raw JSON
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'raw' ? (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '20px' }}>
          <pre style={{ 
            color: '#e0e0e0', 
            fontSize: '12px', 
            margin: 0, 
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px' 
        }}>
          {Object.entries(data || {}).map(([key, value]) => {
            const isExpanded = expandedSections.has(key);
            const icon = getSectionIcon(value);
            const borderColor = getSectionColor(value);
            
            return (
              <div 
                key={key} 
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(168, 85, 247, 0.05))',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '12px',
                  padding: '20px',
                  transition: 'all 0.3s ease',
                  cursor: typeof value === 'object' ? 'pointer' : 'default',
                  position: 'relative'
                }}
                onClick={() => typeof value === 'object' && toggleSection(key)}
                onMouseEnter={(e) => {
                  if (typeof value === 'object') {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = `0 8px 25px ${borderColor}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (typeof value === 'object') {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: getSectionColor(value).replace('0.3', '0.8'),
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ color: '#e0e0e0', margin: 0, fontSize: '16px', fontWeight: '600' }}>
                      {key}
                    </h4>
                    <p style={{ color: '#9ca3af', margin: '2px 0 0 0', fontSize: '12px' }}>
                      {Array.isArray(value) ? `Array with ${value.length} items` : 
                       typeof value === 'object' && value !== null ? `Object with ${Object.keys(value).length} properties` :
                       typeof value}
                    </p>
                  </div>
                  {typeof value === 'object' && (
                    <div style={{ 
                      color: 'rgba(124, 58, 237, 0.6)', 
                      fontSize: '12px',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}>
                      ▶
                    </div>
                  )}
                </div>

                {/* Section Content */}
                <div style={{ 
                  maxHeight: isExpanded ? 'none' : '120px', 
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  {renderSectionContent(value, isExpanded)}
                </div>

                {/* Expand Hint */}
                {typeof value === 'object' && !isExpanded && (
                  <div style={{
                    position: 'absolute',
                    bottom: '15px',
                    right: '15px',
                    color: 'rgba(124, 58, 237, 0.6)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    Click to {isExpanded ? 'collapse' : 'expand'} →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Wrapper component - always use FallbackViewer for now
const JSONCrackWrapper = (props) => {
  // For now, always use the enhanced FallbackViewer
  // Later we can add logic to try JSONGraph first
  return <FallbackViewer {...props} />;
};

// Export both components
export default JSONCrackWrapper;
export { JSONCrackViewer, FallbackViewer };

// Global export for non-module usage
if (typeof window !== 'undefined') {
  window.JSONCrackViewer = JSONCrackWrapper;
}