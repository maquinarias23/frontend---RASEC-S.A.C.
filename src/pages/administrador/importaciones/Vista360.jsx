import { useState, useEffect, useMemo } from 'react';
import { HiOutlineArrowLeft, HiOutlineSave, HiOutlineDownload } from 'react-icons/hi';
import FechasTimeline from './FechasTimeline';
import EstadoBadge from '../../../components/ui/EstadoBadge';
import TablaProductosImportacion from './TablaProductosImportacion';
import TablaIntermediariosImportacion from './TablaIntermediariosImportacion';
import TablaAsientoContable from './TablaAsientoContable';
import useFormulasImportacion from './useFormulasImportacion';
import { formatearFecha } from '../../../utils/formato';
import { ESTADO_IMPORTACION } from '../../../config/constants';
import api from '../../../api/axios';
import toast from 'react-hot-toast';

export default function Vista360({ importacionId, tiposProducto, onVolver }) {
  const [importacion, setImportacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Editable state
  const [header, setHeader] = useState({});
  const [items, setItems] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [asientos, setAsientos] = useState([]);
  const [productos, setProductos] = useState([]);

  const formulasConfig = useMemo(() => {
    if (!header.tipo_producto_id) return [];
    const tipo = (tiposProducto || []).find(t => t.id === parseInt(header.tipo_producto_id));
    return tipo?.formulas || [];
  }, [header.tipo_producto_id, tiposProducto]);

  const { recalcularItems } = useFormulasImportacion(formulasConfig);

  const totalOtrosGastosSoles = useMemo(() => {
    return gastos.reduce((sum, g) => sum + (parseFloat(g.total_soles) || 0), 0);
  }, [gastos]);

  const costoAlmacenTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (parseFloat(it.costo_almacen_soles) || 0), 0);
  }, [items]);

  // Load import data
  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const [resImp, resProd] = await Promise.all([
          api.get(`/importaciones/${importacionId}`),
          api.get('/productos'),
        ]);
        const imp = resImp.data;
        setImportacion(imp);
        setHeader({
          nombre: imp.nombre || '',
          contrato: imp.contrato || '',
          supplier_id: imp.supplier_id || '',
          tipo_producto_id: imp.tipo_producto_id || '',
          fecha_pedido: imp.fecha_pedido ? imp.fecha_pedido.split('T')[0] : '',
          fecha_fabricacion: imp.fecha_fabricacion ? imp.fecha_fabricacion.split('T')[0] : '',
          fecha_embarque: imp.fecha_embarque ? imp.fecha_embarque.split('T')[0] : '',
          fecha_desembarque: imp.fecha_desembarque ? imp.fecha_desembarque.split('T')[0] : '',
          fecha_descarga: imp.fecha_descarga ? imp.fecha_descarga.split('T')[0] : '',
          tipo_cambio: imp.tipo_cambio || '',
          tipo_cambio_intermediario: imp.tipo_cambio_intermediario || '',
        });
        // Mapear valores_custom de la BD a la estructura _custom del frontend
        const itemsConCustom = (imp.items || []).map(it => {
          const _custom = {};
          if (it.valores_custom && it.valores_custom.length > 0) {
            for (const vc of it.valores_custom) {
              if (vc.config_formula?.columna) {
                _custom[vc.config_formula.columna] = parseFloat(vc.valor) || 0;
              }
            }
          }
          return { ...it, _custom: Object.keys(_custom).length > 0 ? _custom : undefined };
        });
        setItems(itemsConCustom);
        setGastos((imp.gastos || []).map(g => ({
          ...g,
          intermediario_id: g.intermediario_id || g.intermediario?.id || '',
          fecha_factura: g.fecha_factura ? g.fecha_factura.split('T')[0] : '',
          fecha_detracciones: g.fecha_detracciones ? g.fecha_detracciones.split('T')[0] : '',
        })));
        setAsientos(imp.asientos || []);
        setProductos(Array.isArray(resProd.data) ? resProd.data : (resProd.data.datos || resProd.data.data || []));
      } catch (err) {
        toast.error('Error al cargar importacion');
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [importacionId]);

  // Recalculate items when gastos total changes
  useEffect(() => {
    if (items.length > 0 && header.tipo_cambio) {
      const recalculados = recalcularItems(items, header.tipo_cambio, totalOtrosGastosSoles);
      setItems(recalculados);
    }
  }, [totalOtrosGastosSoles, header.tipo_cambio]);

  // Items ya llegan recalculados desde TablaProductosImportacion
  const handleItemsChange = (nuevosItems) => {
    setItems(nuevosItems);
  };

  const guardarTodo = async () => {
    setGuardando(true);
    try {
      // 1. Update header
      await api.put(`/importaciones/${importacionId}`, {
        nombre: header.nombre || null,
        contrato: header.contrato || null,
        supplier_id: header.supplier_id ? parseInt(header.supplier_id) : null,
        tipo_producto_id: header.tipo_producto_id ? parseInt(header.tipo_producto_id) : null,
        fecha_pedido: header.fecha_pedido || null,
        fecha_fabricacion: header.fecha_fabricacion || null,
        fecha_embarque: header.fecha_embarque || null,
        fecha_desembarque: header.fecha_desembarque || null,
        fecha_descarga: header.fecha_descarga || null,
        tipo_cambio: header.tipo_cambio ? parseFloat(header.tipo_cambio) : null,
        tipo_cambio_intermediario: header.tipo_cambio_intermediario ? parseFloat(header.tipo_cambio_intermediario) : null,
      });

      // 2. Save items (con valores_custom para columnas personalizadas)
      // Construir mapa columna -> config_formula_id para las personalizadas
      const customColMap = {};
      for (const f of formulasConfig) {
        if (f.es_personalizada && f.id) {
          customColMap[f.columna] = f.id;
        }
      }

      await api.put(`/importaciones/${importacionId}/items`, {
        items: items.filter(i => i.product_id).map(i => {
          const valores_custom = [];
          if (i._custom) {
            for (const [col, val] of Object.entries(i._custom)) {
              const cfId = customColMap[col];
              if (cfId) {
                valores_custom.push({ config_formula_id: cfId, valor: parseFloat(val) || 0 });
              }
            }
          }
          return {
            id: i.id || undefined,
            product_id: parseInt(i.product_id),
            cantidad: parseInt(i.cantidad) || 1,
            codigo_aduanero: i.codigo_aduanero || null,
            unidad_medida: i.unidad_medida || null,
            peso: i.peso ? parseFloat(i.peso) : null,
            costo_unitario_manual: i.costo_unitario_manual ? parseFloat(i.costo_unitario_manual) : null,
            total_item: i.total_item ? parseFloat(i.total_item) : 0,
            costo_total_usd: i.costo_total_usd ? parseFloat(i.costo_total_usd) : null,
            advaloren_usd: i.advaloren_usd ? parseFloat(i.advaloren_usd) : 0,
            flete_usd: i.flete_usd ? parseFloat(i.flete_usd) : 0,
            seguro_usd: i.seguro_usd ? parseFloat(i.seguro_usd) : 0,
            costo_unitario_usd: i.costo_unitario_usd ? parseFloat(i.costo_unitario_usd) : null,
            costo_total_calc_usd: i.costo_total_calc_usd ? parseFloat(i.costo_total_calc_usd) : null,
            costo_total_soles: i.costo_total_soles ? parseFloat(i.costo_total_soles) : null,
            otros_gastos_soles: i.otros_gastos_soles ? parseFloat(i.otros_gastos_soles) : null,
            costo_almacen_soles: i.costo_almacen_soles ? parseFloat(i.costo_almacen_soles) : null,
            costo_unit_almacen_sol: i.costo_unit_almacen_sol ? parseFloat(i.costo_unit_almacen_sol) : null,
            valores_custom: valores_custom.length > 0 ? valores_custom : undefined,
          };
        }),
      });

      // 3. Save gastos
      await api.put(`/importaciones/${importacionId}/gastos`, {
        gastos: gastos.filter(g => g.intermediario_id).map(g => ({
          id: g.id || undefined,
          intermediario_id: parseInt(g.intermediario_id),
          factura: g.factura || null,
          fecha_factura: g.fecha_factura || null,
          precio_usd: g.precio_usd ? parseFloat(g.precio_usd) : null,
          precio_soles: g.precio_soles ? parseFloat(g.precio_soles) : null,
          total_soles: g.total_soles ? parseFloat(g.total_soles) : null,
          fecha_detracciones: g.fecha_detracciones || null,
        })),
      });

      // 4. Save asientos
      await api.put(`/importaciones/${importacionId}/asientos`, {
        asientos: asientos.filter(a => a.cuenta).map(a => ({
          id: a.id || undefined,
          cuenta: a.cuenta,
          descripcion: a.descripcion || null,
          debe: a.debe ? parseFloat(a.debe) : 0,
          haber: a.haber ? parseFloat(a.haber) : 0,
        })),
      });

      toast.success('Importacion guardada correctamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="text-center py-12 text-steel-400">Cargando importacion...</div>;
  }

  if (!importacion) {
    return <div className="text-center py-12 text-red-600">Importacion no encontrada</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={onVolver} className="flex items-center gap-2 text-sm text-steel-400 hover:text-steel-200">
          <HiOutlineArrowLeft className="w-4 h-4" /> Volver al listado
        </button>
        <div className="flex items-center gap-3">
          <EstadoBadge estado={importacion.estado} />
          <button onClick={guardarTodo} className="btn-primary flex items-center gap-2" disabled={guardando}>
            <HiOutlineSave className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar Todo'}
          </button>
        </div>
      </div>

      {/* Header editable */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Nombre</label>
            <input type="text" className="input-field text-sm" value={header.nombre} onChange={e => setHeader({...header, nombre: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Contrato</label>
            <input type="text" className="input-field text-sm" value={header.contrato} onChange={e => setHeader({...header, contrato: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Tipo de Cambio</label>
            <input type="number" step="0.0001" className="input-field text-sm" value={header.tipo_cambio} onChange={e => setHeader({...header, tipo_cambio: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Proveedor</label>
            <div className="text-sm text-steel-100">{importacion.tbl_proveedores?.nombre || '-'}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Tipo de producto</label>
            <select className="input-field text-sm" value={header.tipo_producto_id}
              onChange={e => setHeader({...header, tipo_producto_id: e.target.value})}>
              <option value="">Seleccionar...</option>
              {(tiposProducto || []).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-400 mb-1">Registrado por</label>
            <div className="text-sm text-steel-100">{importacion.tbl_usuarios?.nombres || '-'}</div>
          </div>
        </div>
        <FechasTimeline fechas={header} onChange={(campo, valor) => setHeader({...header, [campo]: valor})} />
      </div>

      {/* Blue table: Products */}
      <TablaProductosImportacion
        items={items}
        onItemsChange={handleItemsChange}
        productos={productos}
        tipoCambio={header.tipo_cambio}
        formulasConfig={formulasConfig}
        totalOtrosGastosSoles={totalOtrosGastosSoles}
      />

      {/* Gray table: Intermediarios */}
      <TablaIntermediariosImportacion
        gastos={gastos}
        onGastosChange={setGastos}
        tipoCambio={header.tipo_cambio_intermediario}
        onTipoCambioChange={(val) => setHeader({...header, tipo_cambio_intermediario: val})}
      />

      {/* Yellow table: Asiento Contable */}
      <TablaAsientoContable
        asientos={asientos}
        onAsientosChange={setAsientos}
        costoAlmacenTotal={costoAlmacenTotal}
      />

      {/* Bottom save bar */}
      <div className="flex justify-end gap-3 pt-4 border-t border-steel-700">
        <button onClick={onVolver} className="btn-secondary">Volver</button>
        <button onClick={guardarTodo} className="btn-primary flex items-center gap-2" disabled={guardando}>
          <HiOutlineSave className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </div>
    </div>
  );
}
