import { createRoot } from 'react-dom/client';
import AdminPage from '../app/page';
import '../app/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root application mount point.');

createRoot(root).render(<AdminPage />);
