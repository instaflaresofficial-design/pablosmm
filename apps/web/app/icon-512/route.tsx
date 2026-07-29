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
          <div style={{ display: 'flex', gap: '8px', height: '120px' }}>
            <div style={{ width: '16px', height: '100%', borderRadius: '8px', background: '#ad823d' }}></div>
            <div style={{ width: '16px', height: '100%', borderRadius: '8px', background: '#f3d8aa' }}></div>
            <div style={{ width: '16px', height: '100%', borderRadius: '8px', background: '#ad823d' }}></div>
          </div>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
