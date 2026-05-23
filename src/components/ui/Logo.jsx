export default function Logo({ size = 'md', showText = false, className = '' }) {
  const dims = { sm: 36, md: 48, lg: 64, xl: 120, '2xl': 180 };
  const s = dims[size] || dims.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo-rasec.png"
        alt="Maquinarias Rasec S.A.C"
        width={s}
        height={s}
        className="object-contain rounded-lg"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(220,38,38,0.15))' }}
      />
      {showText && (
        <div className="leading-none">
          <div className="font-display text-xl tracking-wider text-steel-100">
            MAQUINARIAS
          </div>
          <div className="font-display text-sm tracking-[0.2em] text-primary-600">
            RASEC S.A.C
          </div>
        </div>
      )}
    </div>
  );
}
