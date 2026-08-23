import { useState, useEffect, useCallback } from 'react';
import { HiOutlineRefresh, HiOutlineArrowNarrowRight } from 'react-icons/hi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TablaGenerica from '../ui/TablaGenerica';
import Paginacion from '../ui/Paginacion';
import { TIPO_MOVIMIENTO, ORIGEN_AJUSTE, ORIGEN_AJUSTE_LABEL } from '../../config/constants';
import { formatearFecha, formatearHora } from '../../utils/formato';

const FILTROS_VACIOS = {
  fecha_desde: '',
  fecha_hasta: '',
  almacen_id: '',
  product_id: '',
  tipo: '',
  usuario_id: '',
  origen_ajuste: '',
};

const ESTILO_ORIGEN = {
  [ORIGEN_AJUSTE.IMPORTACION]: 'bg-blue-500/15 text-blue-400',
  [ORIGEN_AJUSTE.COMPRA_LOCAL]: 'bg-cyan-500/15 text-cyan-400',
  [ORIGEN_AJUSTE.OTRO]: 'bg-steel-700 text-steel-300',
};

/**
 * Historial de ajustes manuales de inventario — solo SUPER_ADMINISTRADOR.
 * Rastrea quién ajustó el stock, cuándo, dónde, cuánto y con qué motivo.
 * La paginación y los filtros son de servidor: la tabla es un registro de
 * auditoría que crece sin techo y no se puede traer entera al navegador.
 *
 * @param {Array} almacenes - Almacenes ya cargados por la página contenedora.
 * @param {Array} productos - Productos ya cargados por la página contenedora.
 */
export default function HistorialAjustesInventario({ almacenes = [], productos = [] }) {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [ajustes, setAjustes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [porPagina, setPorPagina] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = { pagina };
      // El backend solo aplica el rango de fechas si vienen ambos extremos.
      if (filtros.fecha_desde && filtros.fecha_hasta) {
        params.fecha_desde = filtros.fecha_desde;
        params.fecha_hasta = filtros.fecha_hasta;
      }
      if (filtros.almacen_id) params.almacen_id = filtros.almacen_id;
      if (filtros.product_id) params.product_id = filtros.product_id;
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.usuario_id) params.usuario_id = filtros.usuario_id;
      if (filtros.origen_ajuste) params.origen_ajuste = filtros.origen_ajuste;

      const { data } = await api.get('/inventario/ajustes', { params });
      setAjustes(data.datos || []);
      setUsuarios(data.usuarios || []);
      setTotal(data.total || 0);
      setPorPagina(data.por_pagina || 0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cargar el historial de ajustes');
      setAjustes([]);
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarFiltro = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    setPagina(1);
  };

  const rangoIncompleto = !!filtros.fecha_desde !== !!filtros.fecha_hasta;
  const totalPaginas = porPagina > 0 ? Math.ceil(total / porPagina) : 1;

  const columnas = [
    { key: 'fecha', label: 'Fecha', render: f => (
      <span className="text-steel-200">{formatearFecha(f.fecha_hora)}</span>
    )},
    { key: 'hora', label: 'Hora', render: f => (
      <span className="text-steel-300 tabular-nums">{formatearHora(f.fecha_hora)}</span>
    )},
    { key: 'usuario_nombre', label: 'Usuario', render: f => (
      <div className="leading-tight">
        <p className="font-medium text-steel-100">{f.usuario_nombre}</p>
        <p className="text-[11px] text-steel-400">{f.usuario_correo}</p>
      </div>
    )},
    { key: 'usuario_rol', label: 'Rol', render: f => (
      <span className="px-2 py-0.5 rounded bg-steel-700 text-steel-300 text-[10px] font-bold uppercase tracking-wider">
        {f.usuario_rol?.replace(/_/g, ' ')}
      </span>
    )},
    { key: 'producto', label: 'Producto', render: f => (
      <span className="text-steel-100">{f.producto}</span>
    )},
    { key: 'almacen', label: 'Almacén', render: f => (
      <span className="text-steel-300">{f.almacen}</span>
    )},
    { key: 'origen_ajuste', label: 'Origen', render: f => (
      <div className="leading-tight">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ESTILO_ORIGEN[f.origen_ajuste] || ESTILO_ORIGEN[ORIGEN_AJUSTE.OTRO]}`}>
          {f.origen_label}
        </span>
        {f.documento_origen && (
          <p className="text-[11px] text-steel-400 mt-1 max-w-[14rem] whitespace-normal">
            {f.documento_origen}
            {f.proveedor_origen && f.origen_ajuste === ORIGEN_AJUSTE.IMPORTACION ? ` — ${f.proveedor_origen}` : ''}
          </p>
        )}
      </div>
    )},
    { key: 'tipo', label: 'Tipo', render: f => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
        f.tipo === TIPO_MOVIMIENTO.INGRESO
          ? 'bg-emerald-500/15 text-emerald-500'
          : 'bg-red-500/15 text-red-500'
      }`}>
        {f.tipo === TIPO_MOVIMIENTO.INGRESO ? 'Ingreso' : 'Salida'}
      </span>
    )},
    { key: 'cantidad', label: 'Cantidad', render: f => (
      <span className={`font-bold ${f.tipo === TIPO_MOVIMIENTO.INGRESO ? 'text-emerald-500' : 'text-red-500'}`}>
        {f.tipo === TIPO_MOVIMIENTO.INGRESO ? '+' : '-'}{f.cantidad}
      </span>
    )},
    { key: 'stock', label: 'Stock disp.', render: f => (
      <span className="inline-flex items-center gap-1 text-steel-300 tabular-nums">
        {f.stock_anterior}
        <HiOutlineArrowNarrowRight className="w-3.5 h-3.5 text-steel-500" />
        <span className="font-semibold text-steel-100">{f.stock_resultante}</span>
      </span>
    )},
    { key: 'motivo', label: 'Motivo', render: f => (
      <span className="text-steel-300 whitespace-normal block max-w-xs" title={f.motivo}>{f.motivo}</span>
    )},
  ];

  return (
    <>
      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label-field">Desde</label>
            <input
              type="date"
              className="input-field w-40"
              value={filtros.fecha_desde}
              onChange={e => cambiarFiltro('fecha_desde', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Hasta</label>
            <input
              type="date"
              className="input-field w-40"
              value={filtros.fecha_hasta}
              onChange={e => cambiarFiltro('fecha_hasta', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Usuario</label>
            <select
              className="input-field w-48"
              value={filtros.usuario_id}
              onChange={e => cambiarFiltro('usuario_id', e.target.value)}
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombres} — {u.rol?.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Almacén</label>
            <select
              className="input-field w-48"
              value={filtros.almacen_id}
              onChange={e => cambiarFiltro('almacen_id', e.target.value)}
            >
              <option value="">Todos los almacenes</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Producto</label>
            <select
              className="input-field w-56"
              value={filtros.product_id}
              onChange={e => cambiarFiltro('product_id', e.target.value)}
            >
              <option value="">Todos los productos</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Tipo</label>
            <select
              className="input-field w-36"
              value={filtros.tipo}
              onChange={e => cambiarFiltro('tipo', e.target.value)}
            >
              <option value="">Ingresos y salidas</option>
              <option value={TIPO_MOVIMIENTO.INGRESO}>Ingreso (+)</option>
              <option value={TIPO_MOVIMIENTO.SALIDA}>Salida (-)</option>
            </select>
          </div>
          <div>
            <label className="label-field">Origen</label>
            <select
              className="input-field w-44"
              value={filtros.origen_ajuste}
              onChange={e => cambiarFiltro('origen_ajuste', e.target.value)}
            >
              <option value="">Todos los orígenes</option>
              <option value={ORIGEN_AJUSTE.IMPORTACION}>{ORIGEN_AJUSTE_LABEL[ORIGEN_AJUSTE.IMPORTACION]}</option>
              <option value={ORIGEN_AJUSTE.COMPRA_LOCAL}>{ORIGEN_AJUSTE_LABEL[ORIGEN_AJUSTE.COMPRA_LOCAL]}</option>
              <option value={ORIGEN_AJUSTE.OTRO}>{ORIGEN_AJUSTE_LABEL[ORIGEN_AJUSTE.OTRO]}</option>
            </select>
          </div>
          <button onClick={limpiarFiltros} className="btn-secondary flex items-center gap-2">
            <HiOutlineRefresh className="w-4 h-4" /> Limpiar
          </button>
        </div>
        {rangoIncompleto && (
          <p className="mt-3 text-xs text-amber-500">
            Completa ambas fechas para filtrar por rango; mientras tanto se muestran todas.
          </p>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-steel-400">
            {cargando ? 'Cargando…' : `${total} ajuste${total === 1 ? '' : 's'} registrado${total === 1 ? '' : 's'}`}
          </p>
        </div>
        <TablaGenerica
          columnas={columnas}
          datos={ajustes}
          cargando={cargando}
          vacio="No hay ajustes manuales registrados con estos filtros."
        />
        <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onChange={setPagina} />
      </div>
    </>
  );
}
