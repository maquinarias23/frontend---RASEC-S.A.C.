import { HiChevronRight } from 'react-icons/hi';

export default function TarjetaResumen({ titulo, valor, icono: Icono, color = 'primary', onClick, ayuda }) {
  const colores = {
    primary: 'bg-primary-500/10 text-primary-600 border-primary-500/20',
    green: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    yellow: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  };

  // Con onClick la tarjeta es un boton real: asi responde al teclado y los
  // lectores de pantalla la anuncian como accionable, no como texto suelto.
  const Contenedor = onClick ? 'button' : 'div';
  const propsAccion = onClick
    ? {
        type: 'button',
        onClick,
        title: ayuda,
        className:
          'card w-full text-left flex items-center gap-4 group cursor-pointer hover:border-primary-500/50 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 transition-all duration-300',
      }
    : {
        className: 'card flex items-center gap-4 group hover:border-steel-600 transition-all duration-300',
      };

  return (
    <Contenedor {...propsAccion}>
      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border ${colores[color] || colores.primary} transition-transform duration-300 group-hover:scale-110`}>
        {Icono && <Icono className="w-6 h-6" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-steel-400 truncate">{titulo}</p>
        <p className="text-xl font-bold text-steel-100 truncate" title={String(valor)}>{valor}</p>
      </div>
      {onClick && (
        <HiChevronRight className="flex-shrink-0 w-5 h-5 text-steel-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
      )}
    </Contenedor>
  );
}
