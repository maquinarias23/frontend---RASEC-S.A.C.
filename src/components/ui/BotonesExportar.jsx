import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineDocumentDownload, HiOutlineTable } from 'react-icons/hi';
import { exportarReporteExcel, exportarReportePdf } from '../../utils/exportarReporte';

/**
 * Par de botones "Excel" / "PDF" para la cabecera de un reporte.
 *
 * Recibe una funcion `reporte()` en vez del objeto ya armado: asi las filas se
 * calculan en el momento del clic —con los datos que hay en pantalla— y no en
 * cada render de la pagina.
 *
 * @param {() => Object} reporte - Devuelve la descripcion del reporte
 *   (ver `utils/exportarReporte`).
 * @param {boolean} [deshabilitado] - Sin datos que exportar.
 */
export default function BotonesExportar({ reporte, deshabilitado = false, className = '' }) {
  const [ocupado, setOcupado] = useState(null); // 'excel' | 'pdf' | null

  const exportar = async (formato) => {
    if (ocupado) return;
    setOcupado(formato);
    try {
      if (formato === 'excel') {
        const archivo = await exportarReporteExcel(reporte());
        toast.success(`Excel generado: ${archivo}`);
      } else {
        // El PDF abre una ventana: hay que llamarlo dentro del gesto del clic,
        // sin await previo, o el bloqueador de pop-ups la corta.
        const destino = await exportarReportePdf(reporte());
        if (destino === 'iframe') {
          toast('El navegador bloqueó la ventana: se abrió el diálogo de impresión.');
        }
      }
    } catch (error) {
      toast.error(error?.message || 'No se pudo generar el archivo');
    }
    setOcupado(null);
  };

  const inactivo = deshabilitado || !!ocupado;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => exportar('excel')}
        disabled={inactivo}
        title={deshabilitado ? 'Sin datos que exportar' : 'Descargar en Excel'}
        className="btn-secondary h-9 px-3 flex items-center gap-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <HiOutlineTable className="w-4 h-4" />
        {ocupado === 'excel' ? 'Generando...' : 'Excel'}
      </button>
      <button
        type="button"
        onClick={() => exportar('pdf')}
        disabled={inactivo}
        title={deshabilitado ? 'Sin datos que exportar' : 'Abrir para imprimir o guardar como PDF'}
        className="btn-secondary h-9 px-3 flex items-center gap-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <HiOutlineDocumentDownload className="w-4 h-4" />
        {ocupado === 'pdf' ? 'Generando...' : 'PDF'}
      </button>
    </div>
  );
}
