export default function Tabs({ tabs = [], tabActual, onChange }) {
  return (
    <div className="border-b border-steel-700 mb-6">
      <nav className="flex gap-0 -mb-px">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => onChange(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
              tabActual === tab.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-steel-400 hover:text-steel-200 hover:border-steel-600'
            }`}>
            {tab.icono && <span className="mr-2">{tab.icono}</span>}
            {tab.label}
            {tab.contador !== undefined && (
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${tabActual === tab.key ? 'bg-primary-500/15 text-primary-600' : 'bg-steel-700 text-steel-400'}`}>
                {tab.contador}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
