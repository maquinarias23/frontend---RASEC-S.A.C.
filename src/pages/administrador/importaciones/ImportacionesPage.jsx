import { useState, useEffect } from 'react';
import { HiOutlineGlobe, HiOutlineCog } from 'react-icons/hi';
import Tabs from '../../../components/ui/Tabs';
import TabImportaciones from './TabImportaciones';
import TabConfigFormulas from './TabConfigFormulas';
import api from '../../../api/axios';

const tabs = [
  { key: 'importaciones', label: 'Importaciones', icono: <HiOutlineGlobe className="w-4 h-4 inline" /> },
  { key: 'config', label: 'Configuración de Fórmulas', icono: <HiOutlineCog className="w-4 h-4 inline" /> },
];

export default function ImportacionesPage() {
  const [tabActual, setTabActual] = useState('importaciones');
  const [tiposProducto, setTiposProducto] = useState([]);

  const cargarTipos = async () => {
    try {
      const { data } = await api.get('/config-formulas-importacion/tipos');
      setTiposProducto(data);
    } catch { setTiposProducto([]); }
  };

  useEffect(() => { cargarTipos(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold font-display tracking-wider text-steel-100 mb-4">Importaciones</h1>
      <Tabs tabs={tabs} tabActual={tabActual} onChange={setTabActual} />
      {tabActual === 'importaciones' && <TabImportaciones tiposProducto={tiposProducto} />}
      {tabActual === 'config' && <TabConfigFormulas tiposProducto={tiposProducto} onTiposChange={cargarTipos} />}
    </div>
  );
}
