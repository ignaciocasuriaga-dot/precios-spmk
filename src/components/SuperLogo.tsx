// SVG logos for each supermarket
export const SUPERMARKET_LOGOS: Record<string, React.ReactNode> = {};

interface LogoProps { size?: number; }

export function TataLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#F97316"/>
      <text x="20" y="27" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="Arial, sans-serif">Ta</text>
    </svg>
  );
}

export function DiscoLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#7C3AED"/>
      <circle cx="20" cy="20" r="10" fill="none" stroke="white" strokeWidth="2.5"/>
      <circle cx="20" cy="20" r="3" fill="white"/>
      <line x1="20" y1="10" x2="20" y2="14" stroke="white" strokeWidth="2"/>
      <line x1="20" y1="26" x2="20" y2="30" stroke="white" strokeWidth="2"/>
      <line x1="10" y1="20" x2="14" y2="20" stroke="white" strokeWidth="2"/>
      <line x1="26" y1="20" x2="30" y2="20" stroke="white" strokeWidth="2"/>
    </svg>
  );
}

export function TiendaInglesaLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#DC2626"/>
      <text x="20" y="27" textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="Arial, sans-serif">TI</text>
    </svg>
  );
}

export function ElDoradoLogo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#D97706"/>
      <polygon points="20,8 24,18 35,18 26,25 29,35 20,28 11,35 14,25 5,18 16,18" fill="white"/>
    </svg>
  );
}

export function SuperLogo({ name, size = 32 }: { name: string; size?: number }) {
  switch (name) {
    case 'Tata':          return <TataLogo size={size} />;
    case 'Disco':         return <DiscoLogo size={size} />;
    case 'Tienda Inglesa': return <TiendaInglesaLogo size={size} />;
    case 'El Dorado':    return <ElDoradoLogo size={size} />;
    default:
      return (
        <div style={{ width: size, height: size }} className="rounded-lg bg-gray-300 flex items-center justify-center text-white text-xs font-bold">
          {name[0]}
        </div>
      );
  }
}
