import React from 'react';
import { Sparkles } from 'lucide-react';

export const HeaderBrand: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '11px',
          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
        }}
      >
        <Sparkles size={17} strokeWidth={2.4} />
      </div>
      <div>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          FLOW
        </h1>
      </div>
    </div>
  );
};
