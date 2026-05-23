import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #bcc3cb',
            borderRadius: '0.75rem',
            fontFamily: 'Barlow, system-ui, sans-serif',
          },
          success: {
            iconTheme: { primary: '#DC2626', secondary: '#ffffff' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#ffffff' },
          },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}
