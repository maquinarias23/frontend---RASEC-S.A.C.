import { useState, useEffect, useRef, useMemo } from 'react';
import {
  HiOutlineSearch, HiOutlineAdjustments, HiOutlineClipboardList,
  HiOutlineTruck, HiOutlineShoppingCart, HiOutlineOfficeBuilding,
  HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineDocumentSearch,
  HiOutlineDownload,
} from 'react-icons/hi';
import useCrud from '../../hooks/useCrud';
import TablaGenerica from '../../components/ui/TablaGenerica';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import TablaProximosIngresos from '../../components/shared/TablaProximosIngresos';
import HistorialAjustesInventario from '../../components/shared/HistorialAjustesInventario';
import useAuthStore from '../../store/authStore';
import { ROLES } from '../../config/roles';
import { AJUSTE_INVENTARIO, TIPO_MOVIMIENTO, ORIGEN_AJUSTE, ORIGEN_AJUSTE_LABEL } from '../../config/constants';
import { formatearFecha, formatearMoneda } from '../../utils/formato';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// Roles que pueden ajustar stock manualmente. ALMACEN entra porque es quien
// hace el conteo físico; cada ajuste suyo queda en el historial auditable.
const ROLES_PUEDEN_AJUSTAR = [ROLES.SUPER_ADMINISTRADOR, ROLES.ADMINISTRADOR, ROLES.ALMACEN];

const AJUSTE_VACIO = {
  product_id: '', tipo: TIPO_MOVIMIENTO.INGRESO, cantidad: '', motivo_texto: '',
  costo_unitario: '', almacen_id: '', origen_ajuste: '', importacion_id: '', compra_id: '',
};

export default function Inventario() {
  const [tabActual, setTabActual] = useState('stock');
  const { datos, cargando, listar } = useCrud('/inventario/por-producto');
  const { datos: almacenes } = useCrud('/almacenes');
  const { usuario } = useAuthStore();
  const esSuperAdmin = usuario?.rol === ROLES.SUPER_ADMINISTRADOR;
  const puedeAjustar = ROLES_PUEDEN_AJUSTAR.includes(usuario?.rol);

  // El historial de ajustes es exclusivo del SUPER_ADMINISTRADOR.
  const tabsInventario = useMemo(() => {
    const tabs = [
      { key: 'stock', label: 'Stock Actual', icono: <HiOutlineClipboardList className="w-4 h-4 inline" /> },
      { key: 'llegadas', label: 'Llegadas de Importación', icono: <HiOutlineTruck className="w-4 h-4 inline" /> },
      { key: 'compras_nacionales', label: 'Compras Nacionales', icono: <HiOutlineShoppingCart className="w-4 h-4 inline" /> },
    ];
    if (esSuperAdmin) {
      tabs.push({ key: 'historial_ajustes', label: 'Historial de Ajustes', icono: <HiOutlineDocumentSearch className="w-4 h-4 inline" /> });
    }
    return tabs;
  }, [esSuperAdmin]);

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [almacenFiltro, setAlmacenFiltro] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null);

  // Modal ajuste
  const [modalAjuste, setModalAjuste] = useState(false);
  const [ajuste, setAjuste] = useState(AJUSTE_VACIO);
  const [guardando, setGuardando] = useState(false);

  // Documentos (importaciones / compras nacionales) que pueden declararse como
  // origen del ajuste. Se piden por producto para ofrecer primero los lotes que
  // sí lo incluyen.
  const [origenes, setOrigenes] = useState({ importaciones: [], compras: [] });
  const [cargandoOrigenes, setCargandoOrigenes] = useState(false);

  // Combobox producto
  const [textoProducto, setTextoProducto] = useState('');
  const [comboAbierto, setComboAbierto] = useState(false);
  const comboRef = useRef(null);

  const almacenesActivos = almacenes.filter(a => a.activo);

  // La importación exige documento; la compra nacional no. El selector de lote
  // es el mismo control para ambos casos, así que se ramifica por esta bandera.
  const esOrigenImportacion = ajuste.origen_ajuste === ORIGEN_AJUSTE.IMPORTACION;

  const productosFiltrados = datos.filter(p =>
    p.nombre.toLowerCase().includes(textoProducto.toLowerCase())
  );

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) setComboAbierto(false);
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  // Los orígenes se recargan al cambiar de producto porque el marcado de
  // "incluye este producto" depende de él.
  useEffect(() => {
    if (!modalAjuste || !ajuste.product_id) {
      setOrigenes({ importaciones: [], compras: [] });
      return;
    }
    let cancelado = false;
    setCargandoOrigenes(true);
    api.get('/inventario/origenes-ajuste', { params: { product_id: ajuste.product_id } })
      .then(({ data }) => { if (!cancelado) setOrigenes({ importaciones: data.importaciones || [], compras: data.compras || [] }); })
      .catch(() => { if (!cancelado) toast.error('No se pudieron cargar las importaciones y compras'); })
      .finally(() => { if (!cancelado) setCargandoOrigenes(false); });
    return () => { cancelado = true; };
  }, [modalAjuste, ajuste.product_id]);

  const categorias = [...new Set(datos.map(p => p.categoria).filter(Boolean))].sort();

  // Filtrar datos — si hay filtro de almacén, recalcular desde desglose
  const datosFiltrados = datos.filter(p => {
    if (categoriaFiltro && p.categoria !== categoriaFiltro) return false;
    if (busqueda) {
      const term = busqueda.toLowerCase();
      if (!p.nombre.toLowerCase().includes(term)) return false;
    }
    return true;
  }).map(p => {
    if (!almacenFiltro) return p;
    const alm = p.desglose_almacenes?.find(d => d.almacen_id === parseInt(almacenFiltro));
    if (!alm) return { ...p, stock_total: 0, disponibles: 0, asignadas: 0, en_proceso: 0, entregadas: 0, canceladas: 0 };
    return { ...p, stock_total: alm.stock_total, disponibles: alm.disponibles, asignadas: alm.asignadas, en_proceso: alm.en_proceso, entregadas: alm.entregadas, canceladas: alm.canceladas };
  });

  const columnas = [
    { key: 'nombre', label: 'Producto' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'precio_venta_base', label: 'Precio Mínimo', render: (f) => formatearMoneda(f.precio_venta_base) },
    { key: 'stock_total', label: 'Stock Total', render: (f) => (
      <span className={`font-bold ${f.stock_total === 0 ? 'text-red-600' : 'text-steel-100'}`}>{f.stock_total}</span>
    )},
    { key: 'disponibles', label: 'Disponibles', render: (f) => (
      <span className="text-emerald-600 font-medium">{f.disponibles}</span>
    )},
    { key: 'asignadas', label: 'Reservadas', render: (f) => (
      <span className="text-blue-600 font-medium">{f.asignadas}</span>
    )},
    { key: 'en_proceso', label: 'En Pedido', render: (f) => (
      <span className="text-amber-600 font-medium">{f.en_proceso}</span>
    )},
    { key: 'entregadas', label: 'Entregado en agencia', render: (f) => (
      <span className="text-teal-600 font-medium">{f.entregadas}</span>
    )},
    { key: 'canceladas', label: 'Retiradas por ajuste', render: (f) => f.canceladas > 0 ? (
      <span className="text-red-600 font-medium">{f.canceladas}</span>
    ) : <span className="text-steel-500">0</span> },
    { key: 'almacenes', label: 'Almacenes', render: (f) => {
      if (!f.desglose_almacenes || f.desglose_almacenes.length === 0 || almacenFiltro) return null;
      const conStock = f.desglose_almacenes.filter(d => d.disponibles > 0);
      if (conStock.length === 0) return <span className="text-steel-500 text-xs">-</span>;
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setExpandido(expandido === f.id ? null : f.id); }}
          className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
        >
          {conStock.length} almacén{conStock.length !== 1 ? 'es' : ''}
          {expandido === f.id ? <HiOutlineChevronUp className="w-3 h-3" /> : <HiOutlineChevronDown className="w-3 h-3" />}
        </button>
      );
    }},
  ];

  const buscarUnidad = async () => {
    if (!busqueda.trim()) return;
    try {
      const { data } = await api.get('/inventario/buscar-serial', { params: { serial: busqueda.trim() } });
      setResultadoBusqueda(data);
      toast.success('Unidad encontrada');
    } catch {
      setResultadoBusqueda(null);
      toast.error('No encontrada');
    }
  };

  // Exporta exactamente lo que el usuario está viendo: se parte de
  // datosFiltrados, así que los filtros de búsqueda, categoría y almacén ya
  // vienen aplicados (con los totales recalculados si hay almacén elegido).
  const exportarInventarioExcel = () => {
    if (!datosFiltrados.length) return;
    import('xlsx').then(XLSX => {
      const almacenSel = almacenFiltro
        ? almacenesActivos.find(a => a.id === parseInt(almacenFiltro))
        : null;

      const filasStock = datosFiltrados.map(p => ({
        Producto: p.nombre,
        Categoria: p.categoria || '',
        'Precio Mínimo': Number(p.precio_venta_base) || 0,
        'Stock Total': Number(p.stock_total) || 0,
        Disponibles: Number(p.disponibles) || 0,
        Reservadas: Number(p.asignadas) || 0,
        'En Pedido': Number(p.en_proceso) || 0,
        'Entregado en agencia': Number(p.entregadas) || 0,
        'Retiradas por ajuste': Number(p.canceladas) || 0,
      }));

      // Fila de totales al pie para cuadrar contra el conteo físico.
      const sumar = (campo) => filasStock.reduce((acc, f) => acc + f[campo], 0);
      filasStock.push({
        Producto: `TOTALES (${filasStock.length} productos)`,
        Categoria: '',
        'Precio Mínimo': '',
        'Stock Total': sumar('Stock Total'),
        Disponibles: sumar('Disponibles'),
        Reservadas: sumar('Reservadas'),
        'En Pedido': sumar('En Pedido'),
        'Entregado en agencia': sumar('Entregado en agencia'),
        'Retiradas por ajuste': sumar('Retiradas por ajuste'),
      });

      const wb = XLSX.utils.book_new();
      const wsStock = XLSX.utils.json_to_sheet(filasStock);
      wsStock['!cols'] = [
        { wch: 45 }, { wch: 18 }, { wch: 14 }, { wch: 11 }, { wch: 12 },
        { wch: 11 }, { wch: 11 }, { wch: 20 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsStock, 'Stock');

      // Segunda hoja con el desglose por almacén: una fila por producto y
      // almacén con existencias, para el conteo en sitio.
      const filasDesglose = [];
      for (const p of datosFiltrados) {
        const desglose = (p.desglose_almacenes || []).filter(d =>
          d.stock_total > 0 && (!almacenFiltro || d.almacen_id === parseInt(almacenFiltro))
        );
        for (const d of desglose) {
          filasDesglose.push({
            Producto: p.nombre,
            Categoria: p.categoria || '',
            Almacen: d.almacen_nombre || 'Sin asignar',
            'Stock Total': Number(d.stock_total) || 0,
            Disponibles: Number(d.disponibles) || 0,
            Reservadas: Number(d.asignadas) || 0,
            'En Pedido': Number(d.en_proceso) || 0,
            'Entregado en agencia': Number(d.entregadas) || 0,
            'Retiradas por ajuste': Number(d.canceladas) || 0,
          });
        }
      }
      if (filasDesglose.length) {
        const wsDesglose = XLSX.utils.json_to_sheet(filasDesglose);
        wsDesglose['!cols'] = [
          { wch: 45 }, { wch: 18 }, { wch: 22 }, { wch: 11 }, { wch: 12 },
          { wch: 11 }, { wch: 11 }, { wch: 20 }, { wch: 20 },
        ];
        XLSX.utils.book_append_sheet(wb, wsDesglose, 'Por Almacén');
      }

      const fecha = new Date().toISOString().slice(0, 10);
      const sufijo = [categoriaFiltro, almacenSel?.nombre]
        .filter(Boolean)
        .map(s => s.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '').trim().replace(/\s+/g, '_'))
        .join('_');
      XLSX.writeFile(wb, `Inventario_${sufijo ? `${sufijo}_` : ''}${fecha}.xlsx`);
      toast.success('Inventario exportado');
    }).catch(() => toast.error('No se pudo generar el Excel'));
  };

  const enviarAjuste = async () => {
    if (!ajuste.product_id || !ajuste.cantidad || parseInt(ajuste.cantidad) <= 0) {
      return toast.error('Selecciona producto y cantidad valida');
    }
    if (!ajuste.almacen_id) {
      return toast.error('Debe seleccionar un almacén');
    }
    if (parseInt(ajuste.cantidad) > AJUSTE_INVENTARIO.MAX_CANTIDAD) {
      return toast.error(`La cantidad no puede superar ${AJUSTE_INVENTARIO.MAX_CANTIDAD} unidades por ajuste`);
    }
    // El motivo es lo que el SUPER_ADMINISTRADOR leerá en el historial: sin él
    // el ajuste queda sin justificación y el backend lo rechaza igual.
    const motivo = ajuste.motivo_texto.trim();
    if (motivo.length < AJUSTE_INVENTARIO.MOTIVO_MIN_LENGTH) {
      return toast.error(`El motivo es obligatorio (mínimo ${AJUSTE_INVENTARIO.MOTIVO_MIN_LENGTH} caracteres)`);
    }
    if (!ajuste.origen_ajuste) {
      return toast.error('Indica de dónde viene el ajuste: importación, compra nacional o sin lote asociado');
    }
    if (ajuste.origen_ajuste === ORIGEN_AJUSTE.IMPORTACION && !ajuste.importacion_id) {
      return toast.error('Selecciona la importación de la que proviene el ajuste');
    }
    setGuardando(true);
    try {
      const payload = {
        product_id: parseInt(ajuste.product_id),
        tipo: ajuste.tipo,
        cantidad: parseInt(ajuste.cantidad),
        motivo_texto: motivo,
        almacen_id: parseInt(ajuste.almacen_id),
        origen_ajuste: ajuste.origen_ajuste,
      };
      if (ajuste.origen_ajuste === ORIGEN_AJUSTE.IMPORTACION) payload.importacion_id = parseInt(ajuste.importacion_id);
      // La compra concreta es opcional: solo viaja si el usuario eligió una.
      if (ajuste.origen_ajuste === ORIGEN_AJUSTE.COMPRA_LOCAL && ajuste.compra_id) payload.compra_id = parseInt(ajuste.compra_id);
      if (ajuste.tipo === TIPO_MOVIMIENTO.INGRESO && ajuste.costo_unitario !== '') {
        payload.costo_unitario = parseFloat(ajuste.costo_unitario);
      }
      const { data } = await api.post('/inventario/ajustar', payload);
      toast.success(data.mensaje);
      cerrarModalAjuste();
      listar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al ajustar inventario');
    } finally {
      setGuardando(false);
    }
  };

  const cerrarModalAjuste = () => {
    setModalAjuste(false);
    setAjuste(AJUSTE_VACIO);
    setTextoProducto('');
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100">Inventario</h1>
        {tabActual === 'stock' && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportarInventarioExcel}
              disabled={cargando || !datosFiltrados.length}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <HiOutlineDownload className="w-4 h-4" /> Exportar Excel
            </button>
            {puedeAjustar && (
              <button onClick={() => setModalAjuste(true)} className="btn-primary flex items-center gap-2">
                <HiOutlineAdjustments className="w-4 h-4" /> Ajustar Inventario
              </button>
            )}
          </div>
        )}
      </div>

      <Tabs tabs={tabsInventario} tabActual={tabActual} onChange={setTabActual} />

      {tabActual === 'llegadas' && <TablaProximosIngresos soloImportaciones mostrarCardRetrasadas />}
      {tabActual === 'compras_nacionales' && <TablaProximosIngresos soloCompras />}
      {tabActual === 'historial_ajustes' && esSuperAdmin && (
        <HistorialAjustesInventario almacenes={almacenesActivos} productos={datos} />
      )}

      {tabActual === 'stock' && <>
      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            className="input-field flex-1 min-w-[200px]"
            placeholder="Buscar producto o serial/codigo..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setResultadoBusqueda(null); }}
            onKeyDown={(e) => e.key === 'Enter' && buscarUnidad()}
          />
          <select
            className="input-field w-48"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas las categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="input-field w-48"
            value={almacenFiltro}
            onChange={(e) => { setAlmacenFiltro(e.target.value); setExpandido(null); }}
          >
            <option value="">Todos los almacenes</option>
            {almacenesActivos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <button onClick={buscarUnidad} className="btn-secondary flex items-center gap-2">
            <HiOutlineSearch className="w-4 h-4" /> Buscar Unidad
          </button>
        </div>
        {resultadoBusqueda && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-400 rounded-lg text-sm">
            <p><strong className="text-steel-200">Producto:</strong> <span className="text-steel-300">{resultadoBusqueda.tbl_productos?.nombre}</span></p>
            <p><strong className="text-steel-200">Serial:</strong> <span className="text-steel-300">{resultadoBusqueda.serial}</span></p>
            <p><strong className="text-steel-200">Codigo Barras:</strong> <span className="text-steel-300">{resultadoBusqueda.codigo_barras}</span></p>
            <p><strong className="text-steel-200">Estado:</strong> <span className="text-steel-300">{resultadoBusqueda.estado_unidad?.replace(/_/g, ' ').toUpperCase()}</span></p>
            <p><strong className="text-steel-200">Almacén:</strong> <span className="text-steel-300">{resultadoBusqueda.tbl_almacenes?.nombre || 'Sin asignar'}</span></p>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="card">
        <TablaGenerica
          columnas={columnas}
          datos={datosFiltrados}
          cargando={cargando}
          filaExpandidaId={expandido}
          onFilaClick={(fila) => setExpandido(expandido === fila.id ? null : fila.id)}
          renderExpandido={(fila) => {
            if (!fila.desglose_almacenes || fila.desglose_almacenes.length === 0) return null;
            return (
              <div className="px-4 py-3 bg-steel-900/20">
                <p className="text-xs font-semibold text-steel-400 mb-2 flex items-center gap-1">
                  <HiOutlineOfficeBuilding className="w-3.5 h-3.5" /> Desglose por almacén
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {fila.desglose_almacenes.filter(d => d.stock_total > 0).map(d => (
                    <div key={d.almacen_id || 'sin'} className="bg-steel-800/50 rounded-lg p-2 text-xs">
                      <span className="font-medium text-steel-200">{d.almacen_nombre}</span>
                      <div className="flex gap-3 mt-1 text-steel-400">
                        <span>Disp: <span className="text-emerald-500 font-medium">{d.disponibles}</span></span>
                        <span>Res: <span className="text-blue-500 font-medium">{d.asignadas}</span></span>
                        <span>Total: <span className="text-steel-300 font-medium">{d.stock_total}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }}
        />
      </div>
      </>}

      {/* Modal Ajustar Inventario */}
      <Modal abierto={modalAjuste} cerrar={cerrarModalAjuste} titulo="Ajustar Inventario">
        <div className="space-y-4">
          <p className="text-xs text-steel-400 bg-steel-800/50 border border-steel-700 rounded-lg p-3">
            Cada ajuste queda registrado con tu usuario, la fecha y hora exactas, el motivo y el
            lote del que proviene. El Super Administrador puede revisar ese historial.
          </p>
          <div>
            <label className="label-field">Producto</label>
            <div ref={comboRef} className="relative">
              <input
                type="text"
                className="input-field w-full"
                placeholder="Escriba para buscar producto..."
                value={textoProducto}
                onChange={(e) => {
                  setTextoProducto(e.target.value);
                  setComboAbierto(true);
                  if (!e.target.value) setAjuste({ ...ajuste, product_id: '' });
                }}
                onFocus={() => setComboAbierto(true)}
              />
              {ajuste.product_id && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-200 text-lg"
                  onClick={() => { setTextoProducto(''); setAjuste({ ...ajuste, product_id: '' }); }}
                >
                  &times;
                </button>
              )}
              {comboAbierto && (
                <ul className="absolute z-50 w-full mt-1 bg-steel-800 border border-steel-700 rounded-lg shadow-steel max-h-48 overflow-y-auto">
                  {productosFiltrados.length > 0 ? productosFiltrados.map(p => (
                    <li
                      key={p.id}
                      onClick={() => {
                        setAjuste({ ...ajuste, product_id: p.id });
                        setTextoProducto(`${p.nombre} (Disp: ${p.disponibles})`);
                        setComboAbierto(false);
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer border-b border-steel-700/50 last:border-0 transition-colors ${
                        ajuste.product_id === p.id
                          ? 'bg-primary-500/20 text-primary-600'
                          : 'text-steel-200 hover:bg-primary-500/10 hover:text-primary-600'
                      }`}
                    >
                      {p.nombre} <span className="text-steel-400 text-xs">(Disp: {p.disponibles})</span>
                    </li>
                  )) : (
                    <li className="px-3 py-2 text-sm text-steel-400">Sin resultados</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="label-field">Almacén *</label>
            <select
              className="input-field w-full"
              value={ajuste.almacen_id}
              onChange={(e) => setAjuste({ ...ajuste, almacen_id: e.target.value })}
            >
              <option value="">-- Seleccionar almacén --</option>
              {almacenesActivos.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}{a.direccion ? ` — ${a.direccion}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field">Origen del Ajuste *</label>
            <select
              className="input-field w-full"
              value={ajuste.origen_ajuste}
              onChange={(e) => setAjuste({ ...ajuste, origen_ajuste: e.target.value, importacion_id: '', compra_id: '' })}
            >
              <option value="">-- ¿De dónde viene esta mercadería? --</option>
              <option value={ORIGEN_AJUSTE.IMPORTACION}>{ORIGEN_AJUSTE_LABEL[ORIGEN_AJUSTE.IMPORTACION]}</option>
              <option value={ORIGEN_AJUSTE.COMPRA_LOCAL}>{ORIGEN_AJUSTE_LABEL[ORIGEN_AJUSTE.COMPRA_LOCAL]}</option>
              <option value={ORIGEN_AJUSTE.OTRO}>{ORIGEN_AJUSTE_LABEL[ORIGEN_AJUSTE.OTRO]} (merma, daño, corrección de conteo)</option>
            </select>
          </div>

          {(ajuste.origen_ajuste === ORIGEN_AJUSTE.IMPORTACION || ajuste.origen_ajuste === ORIGEN_AJUSTE.COMPRA_LOCAL) && (
            <div>
              <label className="label-field">
                {esOrigenImportacion ? 'Importación de procedencia *' : (
                  <>Compra nacional de procedencia <span className="text-steel-400 font-normal">(opcional)</span></>
                )}
              </label>
              {!ajuste.product_id ? (
                <p className="text-xs text-amber-500">Selecciona primero el producto para listar los lotes.</p>
              ) : cargandoOrigenes ? (
                <p className="text-xs text-steel-400">Cargando lotes…</p>
              ) : (
                <>
                  <select
                    className="input-field w-full"
                    value={esOrigenImportacion ? ajuste.importacion_id : ajuste.compra_id}
                    onChange={(e) => setAjuste({
                      ...ajuste,
                      [esOrigenImportacion ? 'importacion_id' : 'compra_id']: e.target.value,
                    })}
                  >
                    <option value="">
                      {esOrigenImportacion ? '-- Seleccionar --' : '-- Sin compra específica --'}
                    </option>
                    {(esOrigenImportacion ? origenes.importaciones : origenes.compras).map(o => (
                      <option key={o.id} value={o.id}>
                        {o.incluye_producto ? '★ ' : ''}{o.etiqueta}
                        {o.proveedor ? ` — ${o.proveedor}` : ''}
                        {o.fecha ? ` — ${formatearFecha(o.fecha)}` : ''}
                        {o.incluye_producto ? ` (incluye ${o.cantidad_producto} u. del producto)` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-steel-400 mt-1">
                    ★ = el lote incluye este producto. Puedes elegir uno sin la estrella si la mercadería
                    llegó fuera de su lista de ítems.
                    {!esOrigenImportacion && ' Déjalo sin seleccionar si no hay una compra concreta que asociar.'}
                  </p>
                </>
              )}
            </div>
          )}

          <div>
            <label className="label-field">Tipo de Ajuste</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAjuste"
                  value={TIPO_MOVIMIENTO.INGRESO}
                  checked={ajuste.tipo === TIPO_MOVIMIENTO.INGRESO}
                  onChange={(e) => setAjuste({ ...ajuste, tipo: e.target.value })}
                  className="text-primary-500"
                />
                <span className="text-emerald-600 font-medium">Ingreso (+)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoAjuste"
                  value={TIPO_MOVIMIENTO.SALIDA}
                  checked={ajuste.tipo === TIPO_MOVIMIENTO.SALIDA}
                  onChange={(e) => setAjuste({ ...ajuste, tipo: e.target.value })}
                  className="text-primary-500"
                />
                <span className="text-red-600 font-medium">Salida (-)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="label-field">Cantidad</label>
            <input
              type="number"
              min="1"
              max={AJUSTE_INVENTARIO.MAX_CANTIDAD}
              className="input-field w-full"
              value={ajuste.cantidad}
              onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })}
              placeholder="Cantidad de unidades"
            />
          </div>

          {ajuste.tipo === TIPO_MOVIMIENTO.INGRESO && (
            <div>
              <label className="label-field">Costo Unitario <span className="text-steel-400 font-normal">(opcional)</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field w-full"
                value={ajuste.costo_unitario}
                onChange={(e) => setAjuste({ ...ajuste, costo_unitario: e.target.value })}
                placeholder="Dejar vacio si no aplica (se asignara 0)"
              />
            </div>
          )}

          <div>
            <label className="label-field">Motivo del Ajuste *</label>
            <textarea
              className="input-field w-full"
              rows={3}
              maxLength={AJUSTE_INVENTARIO.MOTIVO_MAX_LENGTH}
              value={ajuste.motivo_texto}
              onChange={(e) => setAjuste({ ...ajuste, motivo_texto: e.target.value })}
              placeholder="Ej: Corrección por conteo físico, producto dañado, unidad extraviada, etc."
            />
            <p className={`text-xs mt-1 ${ajuste.motivo_texto.trim().length < AJUSTE_INVENTARIO.MOTIVO_MIN_LENGTH ? 'text-amber-500' : 'text-steel-400'}`}>
              Obligatorio — mínimo {AJUSTE_INVENTARIO.MOTIVO_MIN_LENGTH} caracteres ({ajuste.motivo_texto.trim().length}/{AJUSTE_INVENTARIO.MOTIVO_MAX_LENGTH})
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={cerrarModalAjuste} className="btn-secondary">Cancelar</button>
            <button onClick={enviarAjuste} disabled={guardando} className="btn-primary">
              {guardando ? 'Procesando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
