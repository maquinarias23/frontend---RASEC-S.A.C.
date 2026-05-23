import { useState, useEffect } from 'react';
import { HiOutlineShoppingCart, HiOutlineTruck, HiOutlineStar, HiOutlineCube } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { menuPorRol } from '../../config/menuItems';
import usePuntosStore from '../../store/puntosStore';

/* ---------- Configuración dinámica de las cards ---------- */
const clienteMenu = menuPorRol.CLIENTE || [];

const findPath = (label) =>
  clienteMenu.find((item) => item.label === label)?.path ?? '#';

const CARDS = [
  {
    label: 'CATÁLOGO',
    titulo: 'Catálogo',
    to: findPath('Catálogo'),
    Icono: HiOutlineCube,
    colorIcon: 'text-blue-500',
    bgIcon: 'bg-blue-500/10',
    valorKey: null,          // valor estático
    valorFijo: 'Ver todo',
  },
  {
    label: 'PEDIDOS',
    titulo: 'Mis Pedidos',
    to: findPath('Mis Pedidos'),
    Icono: HiOutlineShoppingCart,
    colorIcon: 'text-emerald-500',
    bgIcon: 'bg-emerald-500/10',
    valorKey: 'pedidos',
  },
  {
    label: 'TRACKING',
    titulo: 'Tracking',
    to: findPath('Tracking'),
    Icono: HiOutlineTruck,
    colorIcon: 'text-amber-500',
    bgIcon: 'bg-amber-500/10',
    valorKey: null,
    valorFijo: 'Rastrear',
  },
  {
    label: 'MIS PUNTOS',
    titulo: 'Mis Puntos',
    to: findPath('Mis Puntos'),
    Icono: HiOutlineStar,
    colorIcon: 'text-primary-500',
    bgIcon: 'bg-primary-500/10',
    valorKey: 'puntos',
  },
];

/* ---------- Delays para animación stagger ---------- */
const STAGGER_DELAYS = ['delay-[0ms]', 'delay-[120ms]', 'delay-[240ms]', 'delay-[360ms]'];

export default function DashboardCliente() {
  const [pedidos, setPedidos] = useState(0);
  const { saldo: puntos } = usePuntosStore();

  useEffect(() => {
    api.get('/ventas')
      .then(r => setPedidos(Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => {});
  }, []);

  /* Mapa dinámico para resolver valores por key */
  const valoresMap = { pedidos, puntos };

  const resolverValor = (card) =>
    card.valorKey ? valoresMap[card.valorKey] : card.valorFijo;

  return (
    <div>
      {/* Saludo superior */}
      <p className="text-sm text-steel-400 mb-1">Bienvenido a tu portal exclusivo</p>

      {/* Título de sección */}
      <h1 className="section-title-chromium mb-6">Mi Panel</h1>

      {/* Grid de cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {CARDS.map((card, idx) => {
          const valor = resolverValor(card);

          return (
            <Link key={card.label} to={card.to} className="block">
              <div
                className={`card-chromium animate-count-up ${STAGGER_DELAYS[idx]} flex flex-col items-start gap-3`}
              >
                {/* Label superior premium */}
                <span className="label-chromium">{card.label}</span>

                {/* Icono con fondo gradiente */}
                <div className={`w-10 h-10 rounded-lg ${card.bgIcon} flex items-center justify-center`}>
                  <card.Icono className={`w-6 h-6 ${card.colorIcon}`} />
                </div>

                {/* Titulo */}
                <span className="text-sm font-medium text-steel-300">{card.titulo}</span>

                {/* Valor con estilo financiero */}
                <span className="text-2xl font-bold text-steel-100 num-chromium">{valor}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
