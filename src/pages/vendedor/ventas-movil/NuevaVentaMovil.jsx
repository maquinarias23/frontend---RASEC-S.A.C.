import { useState } from 'react';
import {
  HiOutlineUser,
  HiOutlineTruck,
  HiOutlineShoppingCart,
  HiOutlineCash,
  HiOutlineStar,
  HiOutlineTag,
  HiOutlineGift,
  HiOutlineTrash,
  HiOutlineCollection,
  HiOutlineExclamation,
  HiOutlineOfficeBuilding,
  HiOutlineUserAdd,
  HiOutlineSearch,
  HiCheck,
  HiChevronRight,
  HiChevronLeft,
} from 'react-icons/hi';
import HojaMovil from './HojaMovil';
import BuscadorMovil from './BuscadorMovil';
import {
  SeccionMovil,
  CampoMovil,
  FilaDato,
  SelectorSegmentado,
  ToggleMovil,
  StepperCantidad,
  CampoArchivoMovil,
  AvisoMovil,
} from './UiMovil';
import { formatearMoneda } from '../../../utils/formato';
import {
  TIPO_ENTREGA,
  TIPO_ENTREGA_LABEL,
  TIPOS_ENTREGA_CON_DESTINO,
  MSG_CONTRA_ENTREGA_ZONA,
  TIPO_DESTINO,
  TIPO_PRECIO,
  METODOS_PAGO_LABEL,
  TELEFONO_INPUT,
  DNI_RUC_INPUT,
  CLIENTE_FORM,
} from '../../../config/constants';

const PASOS = [
  { id: 1, titulo: 'Cliente', icono: HiOutlineUser },
  { id: 2, titulo: 'Entrega', icono: HiOutlineTruck },
  { id: 3, titulo: 'Productos', icono: HiOutlineShoppingCart },
  { id: 4, titulo: 'Cobro', icono: HiOutlineCash },
];

/**
 * Nueva venta en celular, repartida en cuatro pasos.
 *
 * El formulario de escritorio es una sola columna larguísima: en un teléfono
 * obliga a decenas de scrolls y a perder de vista lo ya llenado. Aquí se corta
 * por temas —cliente, entrega, productos, cobro— con el total siempre a la
 * vista en el pie.
 *
 * Los pasos NO bloquean: se puede saltar a cualquiera en cualquier momento
 * tocando su número. La única validación es la del escritorio, la de
 * `crearVenta()`, que corre íntegra al confirmar. Los pasos solo ordenan la
 * pantalla; no añaden ni quitan reglas.
 */
export default function NuevaVentaMovil({ vm }) {
  // Arranca siempre en el paso 1: quien lo monta le da una `key` distinta en
  // cada apertura, así que una venta nueva nunca hereda el paso de la anterior.
  const [paso, setPaso] = useState(1);

  const entregaLista = (() => {
    if (vm.tipoEntrega === TIPO_ENTREGA.RETIRO_EN_TIENDA) return true;
    const ubigeoListo = !!vm.departamentoId && !!vm.provinciaId && !!vm.distritoId;
    // Contra-entrega no lleva agencia, pero sí dirección exacta: es a donde va
    // el motorizado y el punto de llegada de la guía de remisión.
    if (vm.tipoEntrega === TIPO_ENTREGA.CONTRA_ENTREGA) {
      return ubigeoListo && !!vm.direccionEntrega?.trim();
    }
    return !!vm.transportistaId && ubigeoListo;
  })();

  const completado = {
    1: !!vm.clienteSeleccionado,
    2: entregaLista,
    3: vm.items.length > 0,
    4: false,
  };

  const hayStockCorto = vm.items.some((i) => i.cantidad > i.stock_disponible);

  return (
    <HojaMovil
      abierta={vm.modalNuevaVenta}
      cerrar={() => vm.setModalNuevaVenta(false)}
      titulo="Nueva venta"
      subtitulo={vm.clienteSeleccionado?.nombre || 'Sin cliente seleccionado'}
      icono="cerrar"
      encabezadoExtra={
        <BarraPasos paso={paso} setPaso={setPaso} completado={completado} />
      }
      pie={
        <PieAsistente
          paso={paso}
          setPaso={setPaso}
          vm={vm}
          hayStockCorto={hayStockCorto}
        />
      }
    >
      {paso === 1 && <PasoCliente vm={vm} />}
      {paso === 2 && <PasoEntrega vm={vm} />}
      {paso === 3 && <PasoProductos vm={vm} />}
      {paso === 4 && <PasoCobro vm={vm} />}
    </HojaMovil>
  );
}

// ---------------------------------------------------------------------------
// Barra de pasos: dónde estoy, qué falta, y salto directo a cualquier paso.
// ---------------------------------------------------------------------------
function BarraPasos({ paso, setPaso, completado }) {
  return (
    <div className="flex items-stretch gap-1 px-2 pb-2">
      {PASOS.map((p) => {
        const activo = paso === p.id;
        const hecho = completado[p.id] && !activo;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setPaso(p.id)}
            className="flex-1 min-w-0 flex flex-col items-center gap-1 py-1.5 rounded-lg active:bg-steel-800/60 transition-colors"
          >
            <span
              className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                activo
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                  : hecho
                    ? 'bg-emerald-500 text-white'
                    : 'bg-steel-800 text-steel-500 border border-steel-700'
              }`}
            >
              {hecho ? <HiCheck className="w-4 h-4" /> : p.id}
            </span>
            <span
              className={`text-[10px] leading-none truncate max-w-full ${
                activo ? 'text-steel-100 font-semibold' : 'text-steel-500'
              }`}
            >
              {p.titulo}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pie: total a la vista y la acción que toca según el paso.
// ---------------------------------------------------------------------------
function PieAsistente({ paso, setPaso, vm, hayStockCorto }) {
  const esUltimo = paso === PASOS.length;

  return (
    <div className="px-3 py-2.5 space-y-2">
      {vm.items.length > 0 && (
        <div className="flex items-baseline justify-between px-1">
          <span className="text-[11px] uppercase tracking-wider text-steel-500">
            {vm.items.length} ítem{vm.items.length !== 1 ? 's' : ''}
            {hayStockCorto && <span className="text-red-600 normal-case"> · revisar stock</span>}
          </span>
          <span className="font-display text-2xl leading-none tracking-wider text-primary-600">
            {formatearMoneda(vm.totalVenta)}
          </span>
        </div>
      )}

      <div className="flex items-stretch gap-2">
        {paso > 1 && (
          <button
            type="button"
            onClick={() => setPaso(paso - 1)}
            className="btn-movil-secundario w-auto px-4"
          >
            <HiChevronLeft className="w-5 h-5" />
            <span className="sr-only">Paso anterior</span>
          </button>
        )}

        {!esUltimo ? (
          <button type="button" onClick={() => setPaso(paso + 1)} className="btn-movil-primario flex-1">
            Continuar <HiChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={vm.crearVenta}
            disabled={vm.creandoVenta || vm.items.length === 0 || !vm.clienteSeleccionado}
            className="btn-movil-primario flex-1"
          >
            {vm.creandoVenta ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <HiOutlineShoppingCart className="w-5 h-5" />
                Crear venta
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PASO 1 — Cliente
// ---------------------------------------------------------------------------
function PasoCliente({ vm }) {
  const avisoExterno = (alVincular) =>
    vm.clienteExterno && (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5">
        <p className="text-sm font-semibold text-amber-800">{CLIENTE_FORM.dniVentaTitulo}</p>
        <p className="mt-1 text-xs text-amber-700 leading-relaxed">
          {CLIENTE_FORM.dniVentaVincular(vm.clienteExterno.nombre)}
        </p>
        <button
          type="button"
          onClick={() => { vm.vincularClienteExterno(); alVincular?.(); }}
          disabled={vm.vinculandoExterno}
          className="btn-movil-primario mt-3"
        >
          {vm.vinculandoExterno ? CLIENTE_FORM.btnVinculando : CLIENTE_FORM.btnVincularVenta}
        </button>
      </div>
    );

  return (
    <div className="divide-y divide-steel-800">
      <SeccionMovil titulo="¿Para quién es la venta?" icono={HiOutlineUser}>
        <BuscadorMovil
          buscarFn={vm.buscarClientes}
          titulo="Buscar cliente"
          placeholder="Nombre, DNI o teléfono"
          icono={HiOutlineSearch}
          valorTexto={vm.clienteSeleccionado?.nombre || ''}
          onSeleccionar={vm.seleccionarCliente}
          onTexto={vm.alEscribirCliente}
          onLimpiar={() => {
            vm.setClienteSeleccionado(null);
            vm.setClientePuntos(0);
            vm.setClienteExterno(null);
          }}
          renderItem={(c) => (
            <div>
              <p className="text-[15px] font-medium text-steel-100 leading-tight">{c.nombre}</p>
              <p className="text-xs text-steel-500 mt-0.5">
                {c.dni && <span>DNI/RUC: {c.dni}</span>}
                {c.dni && c.telefono_principal && <span> · </span>}
                {c.telefono_principal && <span>Tel: {TELEFONO_INPUT.format(c.telefono_principal)}</span>}
              </p>
            </div>
          )}
          renderExtra={({ cerrar }) => (
            <div className="space-y-3">
              {avisoExterno(cerrar)}
              <button
                type="button"
                onClick={() => { cerrar(); vm.setModalCrearCliente(true); }}
                className="btn-movil-secundario"
              >
                <HiOutlineUserAdd className="w-5 h-5" /> Crear nuevo cliente
              </button>
            </div>
          )}
        />

        <button
          type="button"
          onClick={() => vm.setModalCrearCliente(true)}
          className="mt-2.5 w-full text-sm font-medium text-primary-600 py-2.5 rounded-lg active:bg-primary-50"
        >
          + Crear nuevo cliente
        </button>

        {vm.clienteExterno && <div className="mt-3">{avisoExterno()}</div>}

        {vm.clienteSeleccionado && (
          <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-emerald-700 leading-tight">
                  {vm.clienteSeleccionado.nombre}
                </p>
                {vm.clienteSeleccionado.dni && (
                  <p className="text-xs text-emerald-600 mt-0.5">DNI/RUC: {vm.clienteSeleccionado.dni}</p>
                )}
                {vm.clienteSeleccionado.telefono_principal && (
                  <p className="text-xs text-emerald-600">
                    Tel: {TELEFONO_INPUT.format(vm.clienteSeleccionado.telefono_principal)}
                  </p>
                )}
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">
                <HiOutlineStar className="w-4 h-4" />
                {vm.clientePuntos} pts
              </span>
            </div>
          </div>
        )}
      </SeccionMovil>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PASO 2 — Entrega, destino y quién recibe
// ---------------------------------------------------------------------------
function PasoEntrega({ vm }) {
  const esAgencia = vm.tipoEntrega === TIPO_ENTREGA.ENVIO_POR_AGENCIA;
  const esContraEntrega = vm.tipoEntrega === TIPO_ENTREGA.CONTRA_ENTREGA;
  // Envío por agencia y contra-entrega comparten destino: en el primero
  // alimenta el rótulo, en el segundo la guía de remisión.
  const llevaDestino = TIPOS_ENTREGA_CON_DESTINO.includes(vm.tipoEntrega);

  return (
    <div className="divide-y divide-steel-800">
      <SeccionMovil titulo="Forma de entrega" icono={HiOutlineTruck}>
        <SelectorSegmentado
          valor={vm.tipoEntrega}
          onChange={vm.cambiarTipoEntrega}
          opciones={[
            { valor: TIPO_ENTREGA.ENVIO_POR_AGENCIA, label: 'Envío por agencia', icono: HiOutlineTruck },
            { valor: TIPO_ENTREGA.RETIRO_EN_TIENDA, label: 'Retiro en tienda', icono: HiOutlineOfficeBuilding },
            { valor: TIPO_ENTREGA.CONTRA_ENTREGA, label: TIPO_ENTREGA_LABEL[TIPO_ENTREGA.CONTRA_ENTREGA], icono: HiOutlineCash },
          ]}
          columnas={1}
        />

        {llevaDestino && (
          <div className="mt-4 space-y-4">
            {/* La contra-entrega solo llega a Lima y Callao: el destino no
                se elige, y mostrarlo como opcion invitaria a un error. */}
            {!esContraEntrega && (
              <CampoMovil label="Tipo de destino">
                <SelectorSegmentado
                  valor={vm.tipoDestino}
                  onChange={vm.setTipoDestino}
                  opciones={[
                    { valor: TIPO_DESTINO.LIMA, label: 'Lima' },
                    { valor: TIPO_DESTINO.PROVINCIA, label: 'Provincia' },
                  ]}
                  columnas={2}
                />
              </CampoMovil>
            )}

            {esAgencia && (
              <CampoMovil label="Agencia transportista" requerido>
                <select
                  className="select-movil"
                  value={vm.transportistaId}
                  onChange={(e) => vm.setTransportistaId(e.target.value)}
                >
                  <option value="">Seleccionar agencia...</option>
                  {vm.transportistas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </CampoMovil>
            )}

            <CampoMovil label="Departamento" requerido>
              <select
                className="select-movil"
                value={vm.departamentoId}
                onChange={(e) => vm.handleDepartamentoChange(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {vm.departamentosDisponibles.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </CampoMovil>

            <CampoMovil label="Provincia" requerido>
              <select
                className="select-movil"
                value={vm.provinciaId}
                onChange={(e) => vm.handleProvinciaChange(e.target.value)}
                disabled={!vm.departamentoId || (esContraEntrega && vm.provinciasDisponibles.length === 1)}
              >
                <option value="">{vm.departamentoId ? 'Seleccionar...' : 'Primero elija departamento'}</option>
                {vm.provinciasDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </CampoMovil>

            <CampoMovil label="Distrito" requerido>
              <select
                className="select-movil"
                value={vm.distritoId}
                onChange={(e) => vm.setDistritoId(e.target.value)}
                disabled={!vm.provinciaId}
              >
                <option value="">{vm.provinciaId ? 'Seleccionar...' : 'Primero elija provincia'}</option>
                {vm.distritos.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </CampoMovil>

            {esContraEntrega && (
              <CampoMovil
                label="Dirección de entrega"
                requerido
                ayuda="Es a donde va el motorizado y el punto de llegada que declara la guía de remisión."
              >
                <input
                  type="text"
                  className="input-movil"
                  value={vm.direccionEntrega}
                  onChange={(e) => vm.setDireccionEntrega(e.target.value)}
                  placeholder="Calle, número, piso/interior y referencia"
                  maxLength={500}
                />
              </CampoMovil>
            )}
          </div>
        )}

        {esContraEntrega && (
          <div className="mt-4">
            <AvisoMovil tono="ambar" titulo="El cliente paga al recibir el pedido">
              Puede salir del almacén sin adelanto: en ese caso Admin o Supervisión debe autorizar la
              salida. El motorizado entrega solo después de que el abono del total quede registrado y
              aprobado. No genera rótulo, genera guía de remisión.
              <span className="block mt-1 font-semibold">{MSG_CONTRA_ENTREGA_ZONA}</span>
            </AvisoMovil>
          </div>
        )}

        {vm.tipoEntrega === TIPO_ENTREGA.RETIRO_EN_TIENDA && (
          <div className="mt-4">
            <AvisoMovil tono="info" titulo="El cliente retirará el producto en tienda">
              No es necesario especificar dirección de envío.
            </AvisoMovil>
          </div>
        )}
      </SeccionMovil>

      {/* ---- QUIÉN RECIBE ---- */}
      <SeccionMovil
        titulo="Quién recibe"
        icono={HiOutlineUser}
        accion={<span className="text-[11px] text-steel-500">Opcional</span>}
        descripcion="Si no lo completas, el rótulo y la guía de remisión salen a nombre del cliente."
      >
        {!vm.clienteSeleccionado ? (
          <p className="text-xs text-steel-500 italic">Selecciona primero un cliente.</p>
        ) : (
          <div className="space-y-4">
            {vm.contactosCliente.length > 0 && (
              <CampoMovil label="Contactos guardados de este cliente">
                <select
                  className="select-movil"
                  value={vm.contactoSeleccionado}
                  onChange={(e) => vm.elegirContactoReceptor(e.target.value)}
                >
                  <option value="">Ingresar datos nuevos...</option>
                  {vm.contactosCliente.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}{c.numero_documento ? ` — ${c.numero_documento}` : ''}
                    </option>
                  ))}
                </select>
              </CampoMovil>
            )}

            <CampoMovil label="Nombre de quien recibe">
              <input
                type="text"
                className="input-movil"
                value={vm.receptor.nombre}
                onChange={(e) => vm.cambiarCampoReceptor('nombre', e.target.value)}
                placeholder="Nombre completo"
                maxLength={200}
              />
            </CampoMovil>

            <CampoMovil label="DNI o RUC">
              <input
                type="text"
                className="input-movil"
                inputMode={DNI_RUC_INPUT.INPUT_MODE}
                pattern={DNI_RUC_INPUT.PATTERN}
                maxLength={DNI_RUC_INPUT.MAX_LENGTH}
                value={vm.receptor.numero_documento}
                onChange={(e) => vm.cambiarCampoReceptor('numero_documento', DNI_RUC_INPUT.toDigits(e.target.value))}
                placeholder={DNI_RUC_INPUT.PLACEHOLDER}
              />
            </CampoMovil>

            <CampoMovil label="Razón social">
              <input
                type="text"
                className="input-movil"
                value={vm.receptor.razon_social}
                onChange={(e) => vm.cambiarCampoReceptor('razon_social', e.target.value)}
                placeholder="Si recibe una empresa"
                maxLength={300}
              />
            </CampoMovil>

            <CampoMovil label="Teléfono">
              <input
                type="tel"
                className="input-movil"
                inputMode={TELEFONO_INPUT.INPUT_MODE}
                pattern={TELEFONO_INPUT.PATTERN}
                maxLength={TELEFONO_INPUT.MAX_LENGTH}
                value={TELEFONO_INPUT.format(vm.receptor.telefono)}
                onChange={(e) => vm.cambiarCampoReceptor('telefono', TELEFONO_INPUT.toDigits(e.target.value))}
                placeholder={TELEFONO_INPUT.PLACEHOLDER}
              />
            </CampoMovil>

            <CampoMovil label="Observación">
              <textarea
                className="input-movil"
                rows={3}
                value={vm.receptor.observacion}
                onChange={(e) => vm.cambiarCampoReceptor('observacion', e.target.value)}
                placeholder="Indicaciones para la entrega"
                maxLength={500}
              />
            </CampoMovil>

            {vm.receptorTieneDatos(vm.receptor) && (
              <button
                type="button"
                onClick={() => vm.setGuardarReceptor(!vm.guardarReceptor)}
                className="w-full flex items-center gap-3 rounded-xl border border-steel-700 bg-steel-900 px-3.5 py-3 text-left active:bg-steel-800"
              >
                <span
                  className={`w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                    vm.guardarReceptor
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-steel-600'
                  }`}
                >
                  {vm.guardarReceptor && <HiCheck className="w-4 h-4" />}
                </span>
                <span className="text-xs text-steel-300 leading-snug">
                  Guardar en los contactos del cliente para próximas ventas
                </span>
              </button>
            )}
          </div>
        )}
      </SeccionMovil>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PASO 3 — Combos, alta de productos y carrito
// ---------------------------------------------------------------------------
function PasoProductos({ vm }) {
  const tiposPrecio = [
    { key: TIPO_PRECIO.VENDEDOR, label: 'Vendedor', precio: vm.productoTemp?.precio_vendedor },
    { key: TIPO_PRECIO.CATALOGO, label: 'Catálogo', precio: vm.productoTemp?.precio_catalogo },
    { key: TIPO_PRECIO.MAYORISTA, label: 'Mayorista', precio: vm.productoTemp?.precio_mayorista },
  ].filter((tp) => tp.key !== TIPO_PRECIO.MAYORISTA || vm.puedeUsarMayorista);

  const promoElegida = vm.promoItemTemp
    ? vm.promocionesProducto.find((x) => x.id === parseInt(vm.promoItemTemp, 10))
    : null;

  return (
    <div className="divide-y divide-steel-800">
      {/* ---- COMBOS ---- */}
      {vm.combosDisponibles.length > 0 && (
        <SeccionMovil titulo="Cargar combo" icono={HiOutlineCollection}>
          <div className="space-y-2">
            {vm.combosDisponibles.map((combo) => (
              <button
                key={combo.id}
                type="button"
                onClick={() => vm.cargarCombo(combo)}
                disabled={vm.cargandoCombos}
                className="w-full flex items-center gap-3 rounded-xl border border-steel-700 bg-steel-900 px-3.5 py-3 text-left active:bg-steel-800 disabled:opacity-50 transition-colors"
              >
                <HiOutlineCollection className="w-5 h-5 text-primary-500 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-steel-100 truncate">{combo.nombre}</span>
                  <span className="block text-[11px] text-steel-500">
                    {combo.items_combo.length} producto{combo.items_combo.length !== 1 ? 's' : ''}
                  </span>
                </span>
                <HiChevronRight className="w-5 h-5 text-steel-500 shrink-0" />
              </button>
            ))}
          </div>
          {vm.cargandoCombos && (
            <p className="flex items-center gap-2 mt-2.5 text-xs text-steel-400">
              <span className="w-3.5 h-3.5 border-2 border-steel-600 border-t-primary-500 rounded-full animate-spin" />
              Cargando productos del combo...
            </p>
          )}
        </SeccionMovil>
      )}

      {/* ---- AGREGAR PRODUCTO ---- */}
      <SeccionMovil titulo="Agregar producto" icono={HiOutlineShoppingCart}>
        <BuscadorMovil
          buscarFn={vm.buscarProductos}
          titulo="Buscar producto"
          placeholder="Nombre o código del producto"
          valorTexto={vm.productoTemp?.nombre || ''}
          onSeleccionar={vm.seleccionarProducto}
          onLimpiar={() => {
            vm.setProductoTemp(null);
            vm.setStockDisponible(0);
            vm.setPrecioTemp('');
            vm.setPromocionesProducto([]);
            vm.setPromoItemTemp('');
          }}
          renderItem={(p) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-steel-100 leading-tight truncate">{p.nombre}</p>
                {p.tbl_categorias_producto?.nombre && (
                  <p className="text-xs text-steel-500 mt-0.5 truncate">{p.tbl_categorias_producto.nombre}</p>
                )}
              </div>
              <span className="shrink-0 text-sm font-semibold text-blue-600">
                {formatearMoneda(p.precio_vendedor || p.precio_venta_base)}
              </span>
            </div>
          )}
        />

        {vm.productoTemp && (
          <div className="mt-4 space-y-4 rounded-xl border border-steel-700 bg-steel-900/60 p-3.5">
            {/* Stock */}
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs ${
                vm.stockDisponible > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span>Stock disponible:</span>
              <span className="text-base font-bold">{vm.stockDisponible}</span>
              <span>unidad{vm.stockDisponible !== 1 ? 'es' : ''}</span>
              {vm.stockDisponible === 0 && (
                <span className="ml-auto text-[10px] text-right leading-tight">
                  Almacén asignará al despachar
                </span>
              )}
            </div>

            {/* Tipo de precio */}
            <CampoMovil label="Tipo de precio">
              <div className="space-y-2">
                {tiposPrecio.map((tp) => {
                  const activo = vm.tipoPrecio === tp.key;
                  return (
                    <button
                      key={tp.key}
                      type="button"
                      onClick={() => {
                        vm.setTipoPrecio(tp.key);
                        vm.setPrecioTemp(vm.obtenerPrecioPorTipo(vm.productoTemp, tp.key));
                      }}
                      className={`w-full min-h-[48px] flex items-center justify-between gap-3 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
                        activo
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'bg-steel-950 border-steel-700 text-steel-300'
                      }`}
                    >
                      <span>{tp.label}</span>
                      <span className={activo ? 'text-white' : 'text-steel-400'}>
                        {formatearMoneda(tp.precio || vm.productoTemp.precio_venta_base)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CampoMovil>

            <div className="grid grid-cols-2 gap-3">
              <CampoMovil label="Cantidad">
                <StepperCantidad valor={vm.cantidadTemp} onChange={vm.setCantidadTemp} min={1} />
              </CampoMovil>
              <CampoMovil label="Precio unitario (S/)">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  className="input-movil text-right font-semibold"
                  value={vm.precioTemp}
                  onChange={(e) => vm.setPrecioTemp(e.target.value)}
                />
              </CampoMovil>
            </div>

            {/* Promociones del producto */}
            {vm.promocionesProducto.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-2">
                  <HiOutlineTag className="w-4 h-4" />
                  Promociones para este producto
                </label>
                <select
                  className="select-movil bg-white border-amber-300"
                  value={vm.promoItemTemp}
                  onChange={(e) => vm.setPromoItemTemp(e.target.value)}
                >
                  <option value="">Sin promoción de producto</option>
                  {vm.promocionesProducto.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.tipo === 'descuento_porcentaje' ? `${p.valor}%` : formatearMoneda(p.valor)})
                    </option>
                  ))}
                </select>
                {promoElegida && (() => {
                  const subtItem = vm.cantidadTemp * (parseFloat(vm.precioTemp) || 0);
                  const descItem = promoElegida.tipo === 'descuento_porcentaje'
                    ? subtItem * (parseFloat(promoElegida.valor) / 100)
                    : Math.min(parseFloat(promoElegida.valor), subtItem);
                  return (
                    <p className="text-xs text-amber-700 mt-2">
                      Descuento estimado: -{formatearMoneda(descItem)} sobre {formatearMoneda(subtItem)}
                    </p>
                  );
                })()}
              </div>
            )}

            <button type="button" onClick={vm.agregarItem} className="btn-movil-primario">
              <HiOutlineShoppingCart className="w-5 h-5" /> Agregar a la venta
            </button>
          </div>
        )}
      </SeccionMovil>

      {/* ---- CARRITO ---- */}
      <SeccionMovil
        titulo={`Ítems de la venta (${vm.items.length})`}
        icono={HiOutlineCollection}
      >
        {vm.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-steel-500">
            Aún no has agregado productos.
          </p>
        ) : (
          <div className="space-y-2.5">
            {vm.items.map((item, i) => (
              <ItemCarrito
                key={`${item.product_id}-${i}`}
                item={item}
                onQuitar={() => vm.removerItem(i)}
                onToggleRegalo={() => vm.toggleRegalo(i)}
              />
            ))}
          </div>
        )}

        {vm.items.some((item) => item.cantidad > item.stock_disponible) && (
          <div className="mt-3">
            <AvisoMovil tono="rojo" titulo="Stock insuficiente" icono={HiOutlineExclamation}>
              {vm.items
                .filter((item) => item.cantidad > item.stock_disponible)
                .map((item) => item.nombre)
                .join(', ')}{' '}
              — no cuentan con stock suficiente. La venta se puede registrar, pero almacén deberá
              resolver la disponibilidad al despachar.
            </AvisoMovil>
          </div>
        )}
      </SeccionMovil>
    </div>
  );
}

/** Un producto ya agregado, con sus marcas y sus dos acciones. */
function ItemCarrito({ item, onQuitar, onToggleRegalo }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        item.es_regalo ? 'border-emerald-300 bg-emerald-50' : 'border-steel-700 bg-steel-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-steel-100 leading-snug">
          {item.nombre}
        </p>
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar ${item.nombre}`}
          className="-mt-1 -mr-1 p-2 rounded-lg text-red-600 active:bg-red-50 shrink-0"
        >
          <HiOutlineTrash className="w-5 h-5" />
        </button>
      </div>

      {(item.promocion_id || item.cantidad > item.stock_disponible) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.promocion_id && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              <HiOutlineTag className="w-3 h-3" />
              {item.promocion_nombre} (
              {item.promocion_tipo === 'descuento_porcentaje'
                ? `${item.promocion_valor}%`
                : formatearMoneda(item.promocion_valor)}
              )
            </span>
          )}
          {item.cantidad > item.stock_disponible && (
            <span className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
              <HiOutlineExclamation className="w-3 h-3" /> Stock: {item.stock_disponible}
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <p className="text-xs text-steel-400">
          {item.cantidad} × {formatearMoneda(item.precio_unitario_vendido)}
        </p>
        <p className="text-base font-bold text-steel-100">
          {item.es_regalo ? (
            <span className="line-through text-steel-500">{formatearMoneda(item.subtotal)}</span>
          ) : (
            formatearMoneda(item.subtotal)
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleRegalo}
        className={`mt-2.5 w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border text-xs font-bold transition-colors ${
          item.es_regalo
            ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
            : 'border-steel-700 bg-steel-800 text-steel-400'
        }`}
      >
        <HiOutlineGift className="w-4 h-4" />
        {item.es_regalo ? 'ES REGALO — no suma al total' : 'Marcar como regalo'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PASO 4 — Descuentos, totales y adelanto
// ---------------------------------------------------------------------------
function PasoCobro({ vm }) {
  return (
    <div className="divide-y divide-steel-800">
      <SeccionMovil titulo="Descuentos" icono={HiOutlineTag}>
        <div className="space-y-4">
          <CampoMovil label="Promoción general (opcional)">
            <select
              className="select-movil"
              value={vm.promocionId}
              onChange={(e) => vm.setPromocionId(e.target.value)}
            >
              <option value="">Sin promoción</option>
              {vm.promociones
                .filter((p) => !p.alcance || p.alcance === 'general')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.tipo === 'descuento_porcentaje' ? `${p.valor}%` : formatearMoneda(p.valor)})
                  </option>
                ))}
            </select>
          </CampoMovil>

          <CampoMovil
            label="Descuento por puntos (S/)"
            ayuda={
              vm.clienteSeleccionado && vm.clientePuntos > 0
                ? `Puntos disponibles: ${vm.clientePuntos}`
                : undefined
            }
          >
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max={vm.clientePuntos}
              step="1"
              className="input-movil text-right font-semibold"
              value={vm.descuentoPuntos}
              onChange={(e) => vm.setDescuentoPuntos(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder={vm.clienteSeleccionado ? `Máx: ${vm.clientePuntos}` : 'Selecciona cliente'}
              disabled={!vm.clienteSeleccionado || vm.clientePuntos <= 0}
            />
          </CampoMovil>
        </div>
      </SeccionMovil>

      {/* ---- TOTALES ---- */}
      {vm.items.length > 0 && (
        <SeccionMovil titulo="Resumen" icono={HiOutlineCash}>
          <div className="rounded-xl border border-steel-700 bg-steel-900 p-3.5">
            <FilaDato label="Subtotal" valor={formatearMoneda(vm.subtotalVenta)} />
            {vm.items.some((i) => i.es_regalo) && (
              <FilaDato
                label={`Ítems regalo (${vm.items.filter((i) => i.es_regalo).length})`}
                valor="excluidos del total"
                tono="verde"
              />
            )}
            {vm.descuentoPromocionGeneral > 0 && (
              <FilaDato
                label="Descuento promoción general"
                valor={`-${formatearMoneda(vm.descuentoPromocionGeneral)}`}
                tono="verde"
              />
            )}
            {vm.descuentoPromocionProducto > 0 && (
              <FilaDato
                label="Descuento promociones producto"
                valor={`-${formatearMoneda(vm.descuentoPromocionProducto)}`}
                tono="ambar"
              />
            )}
            {vm.descuentoPuntos > 0 && (
              <FilaDato
                label="Descuento puntos"
                valor={`-${formatearMoneda(vm.descuentoPuntos)}`}
                tono="verde"
              />
            )}
            <div className="mt-2 flex items-baseline justify-between border-t border-steel-700 pt-2.5">
              <span className="text-sm font-semibold text-steel-300">Total</span>
              <span className="font-display text-3xl leading-none tracking-wider text-primary-600">
                {formatearMoneda(vm.totalVenta)}
              </span>
            </div>
          </div>
        </SeccionMovil>
      )}

      {/* ---- ADELANTO ---- */}
      {vm.items.length > 0 && (
        <SeccionMovil
          titulo="Registrar adelanto"
          icono={HiOutlineCash}
          accion={
            <ToggleMovil
              activo={vm.conAdelanto}
              etiqueta="Registrar adelanto"
              onToggle={() => {
                const siguiente = !vm.conAdelanto;
                vm.setConAdelanto(siguiente);
                if (!siguiente) {
                  vm.setMontoAdelanto('');
                  vm.setMetodoPagoAdelanto(vm.metodoPagoPorDefecto);
                  vm.setArchivoBoucherAdelanto(null);
                }
              }}
            />
          }
        >
          {vm.conAdelanto ? (
            <div className="space-y-4">
              <CampoMovil label="Monto del adelanto" requerido>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  max={vm.totalVenta}
                  className="input-movil text-right text-lg font-bold"
                  placeholder="0.00"
                  value={vm.montoAdelanto}
                  onChange={(e) => vm.setMontoAdelanto(e.target.value)}
                />
              </CampoMovil>

              <CampoMovil label="Método de pago" requerido>
                <select
                  className="select-movil"
                  value={vm.metodoPagoAdelanto}
                  onChange={(e) => vm.setMetodoPagoAdelanto(e.target.value)}
                >
                  {Object.entries(METODOS_PAGO_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </CampoMovil>

              <CampoMovil label="Voucher / comprobante" requerido>
                <CampoArchivoMovil
                  idBase="adelanto"
                  archivo={vm.archivoBoucherAdelanto}
                  onArchivo={vm.setArchivoBoucherAdelanto}
                />
              </CampoMovil>

              {vm.montoAdelanto && parseFloat(vm.montoAdelanto) > 0 && (
                <div className="rounded-xl bg-steel-900 border border-steel-700 px-3.5 py-3">
                  <FilaDato
                    label="Saldo pendiente tras adelanto"
                    valor={formatearMoneda(Math.max(vm.totalVenta - parseFloat(vm.montoAdelanto), 0))}
                    tono="ambar"
                    fuerte
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-steel-500">
              Actívalo si el cliente ya entregó una parte del pago al registrar la venta.
            </p>
          )}
        </SeccionMovil>
      )}
    </div>
  );
}
