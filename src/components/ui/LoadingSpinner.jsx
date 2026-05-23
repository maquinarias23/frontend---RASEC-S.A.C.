export default function LoadingSpinner({ texto = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-steel-700 border-t-primary-500 rounded-full animate-spin" />
      <p className="mt-3 text-sm text-steel-400">{texto}</p>
    </div>
  );
}
