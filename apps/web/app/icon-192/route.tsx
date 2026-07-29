import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#020203',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* We can just draw the 3 gold bars */}
          <div style={{ display: 'flex', gap: '4px', height: '60px' }}>
            <div style={{ width: '8px', height: '100%', borderRadius: '4px', background: '#ad823d' }}></div>
            <div style={{ width: '8px', height: '100%', borderRadius: '4px', background: '#f3d8aa' }}></div>
            <div style={{ width: '8px', height: '100%', borderRadius: '4px', background: '#ad823d' }}></div>
          </div>
        </div>
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}
