import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function Qr({ text, size = 168 }: { text: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => { let on = true; QRCode.toDataURL(text, { width: size * 2, margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' } }).then((u) => on && setSrc(u)).catch(() => on && setSrc('')); return () => { on = false; }; }, [text, size]);
  return src ? <img src={src} width={size} height={size} alt="QR code" className="rounded-lg" /> : <div style={{ width: size, height: size }} className="rounded-lg bg-slate-100" />;
}
